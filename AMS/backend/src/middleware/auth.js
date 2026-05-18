const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getDatabaseEngine } = require('../config/database');

const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const user = getDatabaseEngine() === 'mongodb'
      ? await User.findById(decoded.id).select('-passwordHash')
      : await User.findByPk(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: `Access denied. Requires: ${roles.join(' or ')}` });
  }
  next();
};

module.exports = { authenticate, requireRole };
