const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true },
  email: { type: String, lowercase: true },
  photoUrl: { type: String },
  photoBase64: { type: String },
  vehicleNumber: { type: String, uppercase: true, trim: true },
  vehicleType: { type: String, enum: ['car', 'bike', 'auto', 'none'], default: 'none' },
  idType: { type: String, enum: ['aadhar', 'passport', 'driving_license', 'other'], default: 'other' },
  idNumber: { type: String },
  company: { type: String },
  purpose: { type: String, required: true },
  purposeCategory: {
    type: String,
    enum: ['meeting', 'delivery', 'maintenance', 'interview', 'parent_visit', 'official', 'other'],
    default: 'meeting',
  },
  personToMeet: { type: String, required: true },
  personToMeetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  department: { type: String },
  checkInTime: { type: Date, default: Date.now },
  checkOutTime: { type: Date },
  expectedDuration: { type: Number, default: 60 },
  expectedCheckOut: { type: Date },
  status: {
    type: String,
    enum: ['checked_in', 'checked_out', 'meeting_complete', 'overdue', 'missing'],
    default: 'checked_in',
  },
  meetingCompletedAt: { type: Date },
  gatekeeperNotifiedAt: { type: Date },
  missingAlertAt: { type: Date },
  missingAlertSent: { type: Boolean, default: false },
  badgeNumber: { type: String },
  hostNotes: { type: String },
  gatekeeperNotes: { type: String },
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

visitorSchema.index({ status: 1 });
visitorSchema.index({ checkInTime: -1 });
visitorSchema.index({ vehicleNumber: 1 });

module.exports = mongoose.models.Visitor || mongoose.model('Visitor', visitorSchema);
