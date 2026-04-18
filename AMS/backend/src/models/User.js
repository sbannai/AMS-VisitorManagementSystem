const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash:  { type: String, required: true },
  role:          { type: String, enum: ['admin','teacher','parent','receptionist','gatekeeper'], required: true },
  phone:         { type: String, trim: true },
  // Teacher fields
  subject:       { type: String },
  classSection:  { type: String },
  // Parent fields
  childName:     { type: String },
  childClass:    { type: String },
  // Display
  avatarInitials:{ type: String },
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

userSchema.methods.comparePassword = function(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

userSchema.index({ role: 1 });

module.exports = mongoose.model('User', userSchema);
