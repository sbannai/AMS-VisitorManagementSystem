const { getDatabaseEngine } = require('../config/database');

module.exports = getDatabaseEngine() === 'mongodb'
  ? require('./mongoose/Appointment')
  : require('./sequelize').Appointment;
