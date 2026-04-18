const path = require('path');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const { createNotification, notifyRole } = require('../services/notification.service');
require('dotenv').config();

// ── Register visitor (receptionist/admin) ─────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const {
      name, phone, email, vehicleNumber, vehicleType, idType, idNumber, company,
      purpose, purposeCategory, personToMeet, personToMeetId, department,
      expectedDuration, photoBase64,
    } = req.body;

    const checkInTime = new Date();
    const expectedCheckOut = new Date(checkInTime.getTime() + (parseInt(expectedDuration) || 60) * 60000);

    // Badge number: auto-generate
    const todayCount = await Visitor.countDocuments({
      checkInTime: { $gte: new Date(new Date().setHours(0,0,0,0)) }
    });
    const badgeNumber = `VIS-${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit'}).replace('/','')}-${String(todayCount+1).padStart(3,'0')}`;

    const visitorData = {
      name, phone, email, vehicleNumber, vehicleType, idType, idNumber, company,
      purpose, purposeCategory: purposeCategory || 'meeting',
      personToMeet, personToMeetId: personToMeetId || null,
      department, expectedDuration: parseInt(expectedDuration) || 60,
      checkInTime, expectedCheckOut, badgeNumber,
      registeredBy: req.user._id,
    };

    // Photo from file upload
    if (req.file) {
      visitorData.photoUrl = `/uploads/photos/${req.file.filename}`;
    }
    // Photo from webcam (base64)
    if (photoBase64 && !req.file) {
      visitorData.photoBase64 = photoBase64;
    }

    const visitor = await Visitor.create(visitorData);

    // Notify gatekeeper of new visitor
    await notifyRole('gatekeeper', {
      title: '🔔 New Visitor Registered',
      message: `${name} has checked in to meet ${personToMeet}. Badge: ${badgeNumber}. Vehicle: ${vehicleNumber || 'None'}. Expected exit: ${expectedCheckOut.toLocaleTimeString()}.`,
      type: 'gatekeeper_alert',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
    });

    // Notify the person to meet (if they have an account)
    if (personToMeetId) {
      await createNotification({
        userId: personToMeetId,
        title: '👤 Visitor Arrived for You',
        message: `${name} from ${company || 'N/A'} has arrived to meet you. Purpose: ${purpose}. Badge: ${badgeNumber}.`,
        type: 'general',
        relatedId: visitor._id,
        relatedModel: 'Visitor',
      });
    }

    res.status(201).json({ success: true, message: 'Visitor registered', visitor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get visitors (with filters) ───────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { status, date, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      filter.checkInTime = { $gte: start, $lte: end };
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { vehicleNumber: { $regex: search, $options: 'i' } },
        { badgeNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [visitors, total] = await Promise.all([
      Visitor.find(filter)
        .populate('registeredBy', 'name')
        .sort({ checkInTime: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Visitor.countDocuments(filter),
    ]);

    res.json({ success: true, visitors, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get single visitor ────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id).populate('registeredBy', 'name');
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    res.json({ success: true, visitor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Mark meeting complete (teacher/receptionist/admin) ─────────────────────────
exports.completeMeeting = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    if (visitor.status === 'checked_out')
      return res.status(400).json({ success: false, message: 'Visitor already checked out' });

    visitor.status = 'meeting_complete';
    visitor.meetingCompletedAt = new Date();
    visitor.hostNotes = req.body.hostNotes || '';
    await visitor.save();

    const alertMinutes = parseInt(process.env.VISITOR_ALERT_MINUTES) || 10;

    // Alert gatekeeper: please let visitor out
    await notifyRole('gatekeeper', {
      title: '✅ Meeting Complete — Visitor Exiting',
      message: `${visitor.name} (Badge: ${visitor.badgeNumber}, Vehicle: ${visitor.vehicleNumber || 'None'}) has completed the meeting with ${visitor.personToMeet}. Please facilitate exit. ALERT in ${alertMinutes} mins if not out.`,
      type: 'meeting_complete',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
      priority: 'high',
    });

    // Notify receptionist
    await notifyRole('receptionist', {
      title: '📋 Visitor Meeting Complete',
      message: `${visitor.name} completed meeting with ${visitor.personToMeet}. Gatekeeper notified. If not out in ${alertMinutes} mins, MISSING alert will trigger.`,
      type: 'gatekeeper_alert',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
    });

    res.json({ success: true, message: `Gatekeeper notified. Missing alert in ${alertMinutes} minutes if not checked out.`, visitor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Checkout visitor (gatekeeper/receptionist) ────────────────────────────────
exports.checkout = async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found' });
    if (visitor.status === 'checked_out')
      return res.status(400).json({ success: false, message: 'Already checked out' });

    visitor.status = 'checked_out';
    visitor.checkOutTime = new Date();
    visitor.gatekeeperNotes = req.body.gatekeeperNotes || '';
    await visitor.save();

    // Notify receptionist
    await notifyRole('receptionist', {
      title: '🚗 Visitor Checked Out',
      message: `${visitor.name} (${visitor.vehicleNumber || 'no vehicle'}) has exited at ${new Date().toLocaleTimeString()}. Duration: ${Math.round((visitor.checkOutTime - visitor.checkInTime)/60000)} mins.`,
      type: 'general',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
    });

    res.json({ success: true, message: 'Visitor checked out successfully', visitor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Active visitors count (for dashboard) ─────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0,0,0,0);

    const [stats, activeVisitors, missingVisitors] = await Promise.all([
      Visitor.aggregate([
        { $match: { checkInTime: { $gte: today } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Visitor.find({ status: { $in: ['checked_in','meeting_complete','overdue'] } })
        .sort({ checkInTime: -1 }).limit(10),
      Visitor.find({ status: 'missing' }).sort({ missingAlertAt: -1 }).limit(5),
    ]);

    const result = { todayTotal: 0, checkedIn: 0, checkedOut: 0, missing: 0, meetingComplete: 0, overdue: 0 };
    stats.forEach(s => {
      const map = { checked_in:'checkedIn', checked_out:'checkedOut', missing:'missing',
                    meeting_complete:'meetingComplete', overdue:'overdue' };
      if (map[s._id]) result[map[s._id]] = s.count;
      result.todayTotal += s.count;
    });

    res.json({ success: true, stats: result, activeVisitors, missingVisitors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
