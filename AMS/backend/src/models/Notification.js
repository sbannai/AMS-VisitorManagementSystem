const { getDatabaseEngine } = require('../config/database');

module.exports = getDatabaseEngine() === 'mongodb'
  ? require('./mongoose/Notification')
  : require('./sequelize').Notification;
