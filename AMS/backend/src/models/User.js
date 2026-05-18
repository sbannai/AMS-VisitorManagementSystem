const { getDatabaseEngine } = require('../config/database');

module.exports = getDatabaseEngine() === 'mongodb'
  ? require('./mongoose/User')
  : require('./sequelize').User;
