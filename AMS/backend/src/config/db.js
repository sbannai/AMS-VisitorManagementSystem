const { sequelize } = require('../models/sequelize');
const mongoose = require('mongoose');
const mysql = require('mysql2/promise');
const { getAdminConnectionConfig, getDatabaseConfig, describeDatabaseConfig } = require('./database');

const connect = async () => {
  const dbConfig = getDatabaseConfig();

  try {
    if (dbConfig.engine === 'mongodb') {
      await mongoose.connect(dbConfig.mongodb.uri, {
        serverSelectionTimeoutMS: dbConfig.mongodb.serverSelectionTimeoutMS,
      });
      console.log(`Database connected [${dbConfig.profile}]: mongodb://${mongoose.connection.host}/${mongoose.connection.name}`);
      return;
    }

    if (dbConfig.engine !== 'mysql') {
      throw new Error(`Unsupported DB_ENGINE "${dbConfig.engine}". Use "mysql" or "mongodb".`);
    }

    if (!['mysql', 'mariadb'].includes(dbConfig.dialect)) {
      throw new Error(`Unsupported DB_DIALECT "${dbConfig.dialect}". This project currently ships with MySQL/MariaDB drivers.`);
    }

    if (!dbConfig.url) {
      const adminConnection = await mysql.createConnection(getAdminConnectionConfig(dbConfig));
      await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
      await adminConnection.end();
    }

    await sequelize.authenticate();
    await sequelize.sync({ alter: dbConfig.syncAlter });
    const safeConfig = describeDatabaseConfig(dbConfig);
    console.log(`Database connected [${safeConfig.profile}]: ${safeConfig.dialect}://${safeConfig.host}:${safeConfig.port}/${safeConfig.database}`);
  } catch (err) {
    console.error(`Database connection error [${dbConfig.profile}]:`, err.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

module.exports = connect;
