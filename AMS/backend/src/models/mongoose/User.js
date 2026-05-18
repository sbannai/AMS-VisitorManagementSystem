const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'teacher', 'parent', 'receptionist', 'gatekeeper'], required: true },
  phone: { type: String, trim: true },
  subject: { type: String },
  classSection: { type: String },
  childName: { type: String },
  childClass: { type: String },
  avatarInitials: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('passwordHash')) return next();
  if (String(this.passwordHash || '').startsWith('$2')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

userSchema.index({ role: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
