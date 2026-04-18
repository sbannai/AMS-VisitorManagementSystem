const jwt   = require('jsonwebtoken');
const User  = require('../models/User');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true });
    if (!user || !await user.comparePassword(password))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getProfile = async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
};

exports.getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role, isActive: true } : { isActive: true };
    const users = await User.find(filter).select('-passwordHash').sort({ name: 1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
