const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  parent:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teacher:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:    { type: String, required: true },
  description: { type: String },
  appointmentDate: { type: String, required: true },  // YYYY-MM-DD
  startTime:  { type: String, required: true },         // HH:MM
  endTime:    { type: String, required: true },
  reason:     {
    type: String,
    enum: ['academics','behaviour','fee','general','progress_report','other'],
    default: 'general'
  },
  status: {
    type: String,
    enum: ['pending','accepted','declined','completed','cancelled'],
    default: 'pending'
  },
  teacherNote:     { type: String },
  meetingSummary:  { type: String },
  declinedReason:  { type: String },
  receptionistNotified:   { type: Boolean, default: false },
  receptionistNotifiedAt: { type: Date },
  notifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

appointmentSchema.index({ parent: 1 });
appointmentSchema.index({ teacher: 1 });
appointmentSchema.index({ appointmentDate: 1 });
appointmentSchema.index({ status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
