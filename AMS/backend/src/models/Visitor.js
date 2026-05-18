const { getDatabaseEngine } = require('../config/database');

module.exports = getDatabaseEngine() === 'mongodb'
  ? require('./mongoose/Visitor')
  : require('./sequelize').Visitor;
