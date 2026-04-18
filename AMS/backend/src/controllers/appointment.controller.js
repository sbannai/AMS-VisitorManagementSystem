const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { createNotification, notifyRole } = require('../services/notification.service');

// ── Create appointment (parent) ───────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const { teacherId, title, description, appointmentDate, startTime, endTime, reason } = req.body;

    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher')
      return res.status(404).json({ success: false, message: 'Teacher not found' });

    // Conflict check
    const conflict = await Appointment.findOne({
      teacher: teacherId,
      appointmentDate,
      status: 'accepted',
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });
    if (conflict)
      return res.status(409).json({ success: false, message: 'Teacher already has an accepted appointment in that slot.' });

    const appt = await Appointment.create({
      parent: req.user._id,
      teacher: teacherId,
      title: title || `Meeting with ${teacher.name}`,
      description, appointmentDate, startTime, endTime,
      reason: reason || 'general',
    });

    await createNotification({
      userId: teacherId,
      title: '📅 New Appointment Request',
      message: `${req.user.name} (parent of ${req.user.childName || 'student'}) has requested an appointment on ${appointmentDate} at ${startTime}.`,
      type: 'appointment_request',
      relatedId: appt._id,
      relatedModel: 'Appointment',
    });

    res.status(201).json({ success: true, message: 'Appointment requested', appointment: appt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get appointments (role-filtered) ─────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { status, from, to, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'parent')  filter.parent  = req.user._id;
    if (req.user.role === 'teacher') filter.teacher = req.user._id;
    if (status) filter.status = status;
    if (from || to) {
      filter.appointmentDate = {};
      if (from) filter.appointmentDate.$gte = from;
      if (to)   filter.appointmentDate.$lte = to;
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('parent',  'name email phone childName childClass avatarInitials')
        .populate('teacher', 'name subject classSection avatarInitials')
        .populate('notifiedBy', 'name')
        .sort({ appointmentDate: -1, startTime: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Appointment.countDocuments(filter),
    ]);

    res.json({ success: true, appointments, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get single ────────────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id)
      .populate('parent',  'name email phone childName childClass avatarInitials')
      .populate('teacher', 'name subject classSection phone avatarInitials')
      .populate('notifiedBy', 'name');
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });

    const canAccess =
      ['admin','receptionist'].includes(req.user.role) ||
      appt.parent._id.equals(req.user._id) ||
      appt.teacher._id.equals(req.user._id);

    if (!canAccess) return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Teacher: accept ───────────────────────────────────────────────────────────
exports.accept = async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });
    if (appt.status !== 'pending')
      return res.status(400).json({ success: false, message: `Cannot accept — status is ${appt.status}` });

    appt.status = 'accepted';
    appt.teacherNote = req.body.teacherNote || '';
    await appt.save();

    await createNotification({
      userId: appt.parent,
      title: '✅ Appointment Accepted',
      message: `${req.user.name} has accepted your appointment on ${appt.appointmentDate} at ${appt.startTime}.${appt.teacherNote ? ' Note: ' + appt.teacherNote : ''}`,
      type: 'appointment_accepted',
      relatedId: appt._id,
      relatedModel: 'Appointment',
    });

    res.json({ success: true, message: 'Appointment accepted', appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Teacher: decline ──────────────────────────────────────────────────────────
exports.decline = async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, teacher: req.user._id });
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });
    if (!['pending','accepted'].includes(appt.status))
      return res.status(400).json({ success: false, message: 'Cannot decline at this stage' });

    appt.status = 'declined';
    appt.declinedReason = req.body.declinedReason || '';
    await appt.save();

    await createNotification({
      userId: appt.parent,
      title: '❌ Appointment Declined',
      message: `${req.user.name} has declined your appointment on ${appt.appointmentDate}.${appt.declinedReason ? ' Reason: ' + appt.declinedReason : ' Please request a new time.'}`,
      type: 'appointment_declined',
      relatedId: appt._id,
      relatedModel: 'Appointment',
    });

    res.json({ success: true, message: 'Appointment declined', appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Teacher: complete + notify receptionist ───────────────────────────────────
exports.complete = async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, teacher: req.user._id })
      .populate('parent', 'name childName');

    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });
    if (appt.status !== 'accepted')
      return res.status(400).json({ success: false, message: 'Only accepted appointments can be completed' });

    appt.status = 'completed';
    appt.meetingSummary = req.body.meetingSummary || '';
    appt.receptionistNotified = true;
    appt.receptionistNotifiedAt = new Date();
    appt.notifiedBy = req.user._id;
    await appt.save();

    // Notify parent
    await createNotification({
      userId: appt.parent._id,
      title: '🤝 Meeting Completed',
      message: `Your meeting with ${req.user.name} on ${appt.appointmentDate} is now complete.${appt.meetingSummary ? ' Summary: ' + appt.meetingSummary : ''}`,
      type: 'appointment_completed',
      relatedId: appt._id,
      relatedModel: 'Appointment',
    });

    // Notify receptionists
    await notifyRole('receptionist', {
      title: '📋 Meeting Completed — Please Record',
      message: `${req.user.name} has completed the meeting with ${appt.parent.name} (${appt.parent.childName || 'student'}) scheduled for ${appt.appointmentDate} at ${appt.startTime}.${appt.meetingSummary ? ' Summary: ' + appt.meetingSummary : ''}`,
      type: 'receptionist_alert',
      relatedId: appt._id,
      relatedModel: 'Appointment',
      priority: 'high',
    });

    res.json({ success: true, message: 'Appointment completed and receptionist notified', appointment: appt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Parent: cancel ────────────────────────────────────────────────────────────
exports.cancel = async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, parent: req.user._id });
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });
    if (['completed','cancelled'].includes(appt.status))
      return res.status(400).json({ success: false, message: 'Cannot cancel this appointment' });

    appt.status = 'cancelled';
    await appt.save();

    await createNotification({
      userId: appt.teacher,
      title: 'Appointment Cancelled',
      message: `${req.user.name} has cancelled the appointment on ${appt.appointmentDate} at ${appt.startTime}.`,
      type: 'general',
      relatedId: appt._id,
      relatedModel: 'Appointment',
    });

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Stats ─────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const matchFilter = {};
    if (req.user.role === 'parent')  matchFilter.parent  = req.user._id;
    if (req.user.role === 'teacher') matchFilter.teacher = req.user._id;

    const stats = await Appointment.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const result = { total: 0, pending: 0, accepted: 0, completed: 0, declined: 0, cancelled: 0 };
    stats.forEach(s => {
      result[s._id] = s.count;
      result.total += s.count;
    });

    const upcoming = await Appointment.find({
      ...matchFilter,
      status: 'accepted',
      appointmentDate: { $gte: new Date().toISOString().split('T')[0] }
    })
      .populate('parent',  'name childName avatarInitials')
      .populate('teacher', 'name subject avatarInitials')
      .sort({ appointmentDate: 1, startTime: 1 })
      .limit(5);

    res.json({ success: true, stats: result, upcoming });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
