const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  type:     {
    type: String,
    enum: ['appointment_request','appointment_accepted','appointment_declined',
           'appointment_completed','receptionist_alert','gatekeeper_alert',
           'visitor_missing','meeting_complete','general'],
    default: 'general'
  },
  relatedId:   { type: mongoose.Schema.Types.ObjectId },
  relatedModel:{ type: String, enum: ['Appointment','Visitor'] },
  isRead:      { type: Boolean, default: false },
  priority:    { type: String, enum: ['low','normal','high','urgent'], default: 'normal' },
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
