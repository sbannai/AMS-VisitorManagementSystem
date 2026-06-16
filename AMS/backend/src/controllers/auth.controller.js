const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getDatabaseEngine } = require('../config/database');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function verifySsoToken(ssoToken) {
  if (!process.env.SSO_JWT_SECRET) {
    const error = new Error('SSO is not configured');
    error.statusCode = 500;
    throw error;
  }

  return jwt.verify(ssoToken, process.env.SSO_JWT_SECRET, {
    issuer: process.env.SSO_JWT_ISSUER || 'sms',
    audience: process.env.SSO_JWT_AUDIENCE || 'ams',
    algorithms: ['HS256'],
  });
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email: email?.toLowerCase(), isActive: true } });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.ssoLogin = async (req, res) => {
  try {
    const { ssoToken } = req.body;

    if (!ssoToken) {
      return res.status(400).json({ success: false, message: 'SSO token is required' });
    }

    const decoded = verifySsoToken(ssoToken);
    const id = decoded.sub;
    const email = decoded.email;
    const schoolcode = decoded.schoolcode;

    if (!id || !email || !schoolcode) {
      return res.status(401).json({ success: false, message: 'Invalid SSO identity' });
    }

    const user = await User.findOne({
      where: {
        id,
        email: String(email).toLowerCase(),
        schoolcode,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const token = signToken(user);
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) {
    console.error(err);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'SSO token expired' });
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ success: false, message: 'Invalid SSO token' });
    }

    res.status(err.statusCode || 500).json({
      success: false,
      message: err.statusCode ? err.message : 'Server error',
    });
  }
};

exports.autoLogin = async (req, res) => {
  try {
    if (getDatabaseEngine() !== 'mysql') {
      return res.status(404).json({ success: false, message: 'Auto login is only available for SQL mode' });
    }

    const roles = ['admin', 'receptionist', 'teacher', 'gatekeeper', 'parent'];
    let user = null;

    for (const role of roles) {
      user = await User.findOne({ where: User.roleWhere(role), order: [['id', 'ASC']] });
      if (user) break;
    }

    if (!user) {
      user = await User.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'No active SQL user found for auto login' });
    }

    const token = signToken(user);
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
    const where = role ? User.roleWhere(role) : { isActive: true };
    const users = await User.findAll({
      where,
      attributes: { exclude: ['passwordHash'] },
      order: [['name', 'ASC']],
    });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
