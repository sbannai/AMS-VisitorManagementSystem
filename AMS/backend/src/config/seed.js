require('dotenv').config();
const connect = require('./db');
const { sequelize, Appointment, Notification, Visitor } = require('../models/sequelize');
const MongoUser = require('../models/User');
const { getDatabaseEngine } = require('./database');

const MONGO_USERS = [
  { name: 'Admin User', email: 'admin@school.com', passwordHash: 'demo123', role: 'admin', avatarInitials: 'AU', phone: '9000000001' },
  { name: 'Priya Sharma', email: 'reception@school.com', passwordHash: 'demo123', role: 'receptionist', avatarInitials: 'PS', phone: '9000000002' },
  { name: 'Rajan Kumar', email: 'gate@school.com', passwordHash: 'demo123', role: 'gatekeeper', avatarInitials: 'RK', phone: '9000000003' },
  { name: 'Ramesh Gupta', email: 'ramesh@school.com', passwordHash: 'demo123', role: 'teacher', subject: 'Mathematics', classSection: '10-A', avatarInitials: 'RG', phone: '9000000004' },
  { name: 'Sunita Patel', email: 'sunita@school.com', passwordHash: 'demo123', role: 'teacher', subject: 'Science', classSection: '9-B', avatarInitials: 'SP', phone: '9000000005' },
  { name: 'Arjun Menon', email: 'arjun@school.com', passwordHash: 'demo123', role: 'teacher', subject: 'English', classSection: '8-C', avatarInitials: 'AM', phone: '9000000006' },
  { name: 'Ravi Kumar', email: 'ravi@parent.com', passwordHash: 'demo123', role: 'parent', childName: 'Ananya Kumar', childClass: '10-A', avatarInitials: 'RK2', phone: '9000000007' },
  { name: 'Meena Reddy', email: 'meena@parent.com', passwordHash: 'demo123', role: 'parent', childName: 'Vikram Reddy', childClass: '9-B', avatarInitials: 'MR', phone: '9000000008' },
  { name: 'Suresh Nair', email: 'suresh@parent.com', passwordHash: 'demo123', role: 'parent', childName: 'Kavya Nair', childClass: '8-C', avatarInitials: 'SN', phone: '9000000009' },
];

async function seed() {
  await connect();

  if (getDatabaseEngine() === 'mongodb') {
    await MongoUser.deleteMany({});
    for (const user of MONGO_USERS) {
      await MongoUser.create(user);
    }
    console.log(`Seeded ${MONGO_USERS.length} MongoDB users.`);
    console.log('Demo accounts use password: demo123');
    process.exit(0);
  }

  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await Notification.destroy({ where: {}, truncate: true });
  await Visitor.destroy({ where: {}, truncate: true });
  await Appointment.destroy({ where: {}, truncate: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('Cleared AMS appointments, visitors, and notifications.');
  console.log('User login data is read from existing EduChoice userprofiles.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
