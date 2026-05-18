const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('./socket.service');
const { getDatabaseEngine } = require('../config/database');

async function createNotification({ userId, title, message, type, relatedId, relatedModel, priority = 'normal' }) {
  const notif = await Notification.create({ userId, title, message, type, relatedId, relatedModel, priority });
  emitToUser(userId, 'notification', { notification: notif });
  return notif;
}

async function notifyRole(role, { title, message, type, relatedId, relatedModel, priority = 'normal' }) {
  if (getDatabaseEngine() === 'mongodb') {
    const users = await User.find({ role, isActive: true }).select('_id');
    const notifications = await Notification.insertMany(
      users.map(u => ({ userId: u._id, title, message, type, relatedId, relatedModel, priority }))
    );
    users.forEach((u, i) => {
      emitToUser(u._id, 'notification', { notification: notifications[i] });
    });
    return notifications;
  }

  const users = await User.findAll({ where: User.roleWhere(role), attributes: ['id'] });
  const notifications = await Notification.bulkCreate(
    users.map(u => ({ userId: u.id, title, message, type, relatedId, relatedModel, priority })),
    { returning: true }
  );
  users.forEach((u, i) => {
    emitToUser(u.id, 'notification', { notification: notifications[i] });
  });
  return notifications;
}

async function notifyMultipleRoles(roles, payload) {
  for (const role of roles) await notifyRole(role, payload);
}

module.exports = { createNotification, notifyRole, notifyMultipleRoles };
