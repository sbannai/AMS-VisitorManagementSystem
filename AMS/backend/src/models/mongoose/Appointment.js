const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  appointmentDate: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  reason: {
    type: String,
    enum: ['academics', 'behaviour', 'fee', 'general', 'progress_report', 'other'],
    default: 'general',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed', 'cancelled'],
    default: 'pending',
  },
  teacherNote: { type: String },
  meetingSummary: { type: String },
  declinedReason: { type: String },
  receptionistNotified: { type: Boolean, default: false },
  receptionistNotifiedAt: { type: Date },
  notifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: true,
  collection: process.env.MONGODB_APPOINTMENTS_COLLECTION || 'appointments',
});

appointmentSchema.index({ parent: 1 });
appointmentSchema.index({ teacher: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
