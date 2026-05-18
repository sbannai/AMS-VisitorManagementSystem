const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { getDatabaseConfig } = require('../../config/database');

const databaseConfig = getDatabaseConfig();

const sequelizeOptions = {
  host: databaseConfig.host,
  port: databaseConfig.port,
  dialect: databaseConfig.dialect,
  logging: databaseConfig.logging ? console.log : false,
  pool: databaseConfig.pool,
};

const sequelize = databaseConfig.url
  ? new Sequelize(databaseConfig.url, sequelizeOptions)
  : new Sequelize(
    databaseConfig.database,
    databaseConfig.username,
    databaseConfig.password,
    sequelizeOptions
  );

const ROLE_TO_APP = {
  admin: 'admin',
  'head admin': 'admin',
  teacher: 'teacher',
  student: 'parent',
  parent: 'parent',
  receptionist: 'receptionist',
  gatekeeper: 'gatekeeper',
};

const APP_TO_DB_ROLES = {
  admin: ['Admin', 'Head Admin', 'admin', 'head admin'],
  teacher: ['Teacher', 'teacher'],
  parent: ['Student', 'Parent', 'student', 'parent'],
  receptionist: ['Receptionist', 'receptionist'],
  gatekeeper: ['Gatekeeper', 'gatekeeper'],
};

function normalizeRole(role) {
  const value = String(role || '').trim();
  return ROLE_TO_APP[value.toLowerCase()] || value.toLowerCase();
}

function toDatabaseRole(role) {
  const normalized = normalizeRole(role);
  const roles = APP_TO_DB_ROLES[normalized];
  return roles ? roles[0] : role;
}

function initialsFromName(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
}

function withMongoId(model) {
  const originalToJSON = model.prototype.toJSON;
  model.prototype.toJSON = function toJSON() {
    const values = originalToJSON.call(this);
    values._id = values.id;
    return values;
  };
}

const User = sequelize.define('User', {
  schoolcode: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: process.env.SCHOOL_CODE || 'AMS',
  },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password',
  },
  role: {
    type: DataTypes.STRING(100),
    allowNull: false,
    get() {
      return normalizeRole(this.getDataValue('role'));
    },
    set(value) {
      this.setDataValue('role', toDatabaseRole(value));
    },
  },
  phone: DataTypes.VIRTUAL,
  subject: DataTypes.VIRTUAL,
  classSection: DataTypes.VIRTUAL,
  childName: DataTypes.VIRTUAL,
  childClass: DataTypes.VIRTUAL,
  avatarInitials: {
    type: DataTypes.VIRTUAL,
    get() {
      return initialsFromName(this.getDataValue('name'));
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'status',
  },
}, {
  tableName: 'userprofiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['role'] }, { fields: ['schoolcode'] }],
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('email') && user.email) user.email = user.email.toLowerCase().trim();
      if (user.changed('passwordHash') && !String(user.passwordHash || '').startsWith('$2')) {
        user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
      }
    },
  },
});

User.normalizeRole = normalizeRole;
User.roleWhere = function roleWhere(role) {
  const roles = APP_TO_DB_ROLES[normalizeRole(role)] || [role];
  return { role: { [Sequelize.Op.in]: roles }, isActive: true };
};

User.prototype.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

User.prototype.toSafeObject = function toSafeObject() {
  const obj = this.toJSON();
  delete obj.passwordHash;
  return obj;
};

const Appointment = sequelize.define('Appointment', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: DataTypes.TEXT,
  appointmentDate: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.STRING, allowNull: false },
  endTime: { type: DataTypes.STRING, allowNull: false },
  reason: {
    type: DataTypes.ENUM('academics', 'behaviour', 'fee', 'general', 'progress_report', 'other'),
    defaultValue: 'general',
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'declined', 'completed', 'cancelled'),
    defaultValue: 'pending',
  },
  teacherNote: DataTypes.TEXT,
  meetingSummary: DataTypes.TEXT,
  declinedReason: DataTypes.TEXT,
  receptionistNotified: { type: DataTypes.BOOLEAN, defaultValue: false },
  receptionistNotifiedAt: DataTypes.DATE,
}, {
  tableName: 'ams_appointments',
  indexes: [
    { fields: ['parentId'] },
    { fields: ['teacherId'] },
    { fields: ['appointmentDate'] },
    { fields: ['status'] },
  ],
});

const Notification = sequelize.define('Notification', {
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: {
    type: DataTypes.ENUM(
      'appointment_request', 'appointment_accepted', 'appointment_declined',
      'appointment_completed', 'receptionist_alert', 'gatekeeper_alert',
      'visitor_missing', 'meeting_complete', 'general'
    ),
    defaultValue: 'general',
  },
  relatedId: DataTypes.INTEGER,
  relatedModel: DataTypes.ENUM('Appointment', 'Visitor'),
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal',
  },
}, {
  tableName: 'ams_notifications',
  indexes: [
    { fields: ['userId', 'isRead'] },
    { fields: ['createdAt'] },
  ],
});

const Visitor = sequelize.define('Visitor', {
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  email: DataTypes.STRING,
  photoUrl: DataTypes.STRING,
  photoBase64: DataTypes.TEXT('long'),
  vehicleNumber: DataTypes.STRING,
  vehicleType: {
    type: DataTypes.ENUM('car', 'bike', 'auto', 'none'),
    defaultValue: 'none',
  },
  idType: {
    type: DataTypes.ENUM('aadhar', 'passport', 'driving_license', 'other'),
    defaultValue: 'other',
  },
  idNumber: DataTypes.STRING,
  company: DataTypes.STRING,
  purpose: { type: DataTypes.STRING, allowNull: false },
  purposeCategory: {
    type: DataTypes.ENUM('meeting', 'delivery', 'maintenance', 'interview', 'parent_visit', 'official', 'other'),
    defaultValue: 'meeting',
  },
  personToMeet: { type: DataTypes.STRING, allowNull: false },
  department: DataTypes.STRING,
  checkInTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  checkOutTime: DataTypes.DATE,
  expectedDuration: { type: DataTypes.INTEGER, defaultValue: 60 },
  expectedCheckOut: DataTypes.DATE,
  status: {
    type: DataTypes.ENUM('checked_in', 'checked_out', 'meeting_complete', 'overdue', 'missing'),
    defaultValue: 'checked_in',
  },
  meetingCompletedAt: DataTypes.DATE,
  gatekeeperNotifiedAt: DataTypes.DATE,
  missingAlertAt: DataTypes.DATE,
  missingAlertSent: { type: DataTypes.BOOLEAN, defaultValue: false },
  badgeNumber: DataTypes.STRING,
  hostNotes: DataTypes.TEXT,
  gatekeeperNotes: DataTypes.TEXT,
}, {
  tableName: 'ams_visitors',
  indexes: [
    { fields: ['status'] },
    { fields: ['checkInTime'] },
    { fields: ['vehicleNumber'] },
  ],
  hooks: {
    beforeSave: (visitor) => {
      if (visitor.changed('email') && visitor.email) visitor.email = visitor.email.toLowerCase();
      if (visitor.changed('vehicleNumber') && visitor.vehicleNumber) {
        visitor.vehicleNumber = visitor.vehicleNumber.toUpperCase().trim();
      }
    },
  },
});

User.hasMany(Appointment, { foreignKey: 'parentId', as: 'parentAppointments' });
User.hasMany(Appointment, { foreignKey: 'teacherId', as: 'teacherAppointments' });
User.hasMany(Appointment, { foreignKey: 'notifiedById', as: 'notifiedAppointments' });
Appointment.belongsTo(User, { foreignKey: 'parentId', as: 'parent' });
Appointment.belongsTo(User, { foreignKey: 'teacherId', as: 'teacher' });
Appointment.belongsTo(User, { foreignKey: 'notifiedById', as: 'notifiedBy' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Visitor, { foreignKey: 'personToMeetId', as: 'hostVisits' });
User.hasMany(Visitor, { foreignKey: 'registeredById', as: 'registeredVisits' });
Visitor.belongsTo(User, { foreignKey: 'personToMeetId', as: 'personToMeetUser' });
Visitor.belongsTo(User, { foreignKey: 'registeredById', as: 'registeredBy' });

[User, Appointment, Notification, Visitor].forEach(withMongoId);

module.exports = { sequelize, Sequelize, Op: Sequelize.Op, User, Appointment, Notification, Visitor };
