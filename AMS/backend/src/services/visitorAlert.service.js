const cron = require('node-cron');
const { Op, Visitor } = require('../models/sequelize');
const MongoVisitor = require('../models/Visitor');
const { notifyRole } = require('./notification.service');
const { getDatabaseEngine } = require('../config/database');
require('dotenv').config();

const ALERT_MINUTES = parseInt(process.env.VISITOR_ALERT_MINUTES) || 10;

function startVisitorAlertCron() {
  cron.schedule('* * * * *', async () => {
    try {
      if (getDatabaseEngine() === 'mongodb') {
        await runMongoVisitorAlerts();
        return;
      }

      const now = new Date();
      const overdueWindow = new Date(now.getTime() - ALERT_MINUTES * 60 * 1000);

      const overdueVisitors = await Visitor.findAll({
        where: {
          status: 'meeting_complete',
          meetingCompletedAt: { [Op.lte]: overdueWindow },
          missingAlertSent: false,
        },
      });

      for (const visitor of overdueVisitors) {
        visitor.status = 'missing';
        visitor.missingAlertAt = now;
        visitor.missingAlertSent = true;
        await visitor.save();

        const minutesOver = Math.floor((now - visitor.meetingCompletedAt) / 60000);

        await notifyRole('gatekeeper', {
          title: 'MISSING VISITOR ALERT',
          message: `${visitor.name} (${visitor.vehicleNumber || 'No vehicle'}) came to meet ${visitor.personToMeet}. Meeting was marked complete ${minutesOver} minutes ago but visitor has NOT checked out. Immediate action required!`,
          type: 'visitor_missing',
          relatedId: visitor.id,
          relatedModel: 'Visitor',
          priority: 'urgent',
        });

        await notifyRole('receptionist', {
          title: 'MISSING VISITOR - Action Required',
          message: `Visitor ${visitor.name} (Vehicle: ${visitor.vehicleNumber || 'N/A'}) has been on premises for ${minutesOver} minutes after meeting completion. Gatekeeper has been alerted.`,
          type: 'visitor_missing',
          relatedId: visitor.id,
          relatedModel: 'Visitor',
          priority: 'urgent',
        });

        await notifyRole('admin', {
          title: 'Missing Visitor Alert Triggered',
          message: `System auto-alert: ${visitor.name} has not exited after meeting with ${visitor.personToMeet}. Alert sent to gatekeeper at ${now.toLocaleTimeString()}.`,
          type: 'visitor_missing',
          relatedId: visitor.id,
          relatedModel: 'Visitor',
          priority: 'high',
        });

        console.log(`Missing visitor alert sent for: ${visitor.name}`);
      }

      const expectedOverdue = await Visitor.findAll({
        where: {
          status: 'checked_in',
          expectedCheckOut: { [Op.lte]: now },
          missingAlertSent: false,
        },
      });

      for (const visitor of expectedOverdue) {
        visitor.status = 'overdue';
        await visitor.save();

        await notifyRole('receptionist', {
          title: 'Visitor Overdue',
          message: `${visitor.name} was expected to leave at ${visitor.expectedCheckOut?.toLocaleTimeString() || 'N/A'} but has not checked out yet.`,
          type: 'gatekeeper_alert',
          relatedId: visitor.id,
          relatedModel: 'Visitor',
          priority: 'high',
        });
      }
    } catch (err) {
      console.error('Visitor cron error:', err.message);
    }
  });

  console.log(`Visitor alert cron started (${ALERT_MINUTES} min threshold)`);
}

async function runMongoVisitorAlerts() {
  const now = new Date();
  const overdueWindow = new Date(now.getTime() - ALERT_MINUTES * 60 * 1000);

  const overdueVisitors = await MongoVisitor.find({
    status: 'meeting_complete',
    meetingCompletedAt: { $lte: overdueWindow },
    missingAlertSent: false,
  });

  for (const visitor of overdueVisitors) {
    visitor.status = 'missing';
    visitor.missingAlertAt = now;
    visitor.missingAlertSent = true;
    await visitor.save();

    const minutesOver = Math.floor((now - visitor.meetingCompletedAt) / 60000);

    await notifyRole('gatekeeper', {
      title: 'MISSING VISITOR ALERT',
      message: `${visitor.name} (${visitor.vehicleNumber || 'No vehicle'}) came to meet ${visitor.personToMeet}. Meeting was marked complete ${minutesOver} minutes ago but visitor has NOT checked out. Immediate action required!`,
      type: 'visitor_missing',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
      priority: 'urgent',
    });

    await notifyRole('receptionist', {
      title: 'MISSING VISITOR - Action Required',
      message: `Visitor ${visitor.name} (Vehicle: ${visitor.vehicleNumber || 'N/A'}) has been on premises for ${minutesOver} minutes after meeting completion. Gatekeeper has been alerted.`,
      type: 'visitor_missing',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
      priority: 'urgent',
    });

    await notifyRole('admin', {
      title: 'Missing Visitor Alert Triggered',
      message: `System auto-alert: ${visitor.name} has not exited after meeting with ${visitor.personToMeet}. Alert sent to gatekeeper at ${now.toLocaleTimeString()}.`,
      type: 'visitor_missing',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
      priority: 'high',
    });
  }

  const expectedOverdue = await MongoVisitor.find({
    status: 'checked_in',
    expectedCheckOut: { $lte: now },
    missingAlertSent: false,
  });

  for (const visitor of expectedOverdue) {
    visitor.status = 'overdue';
    await visitor.save();

    await notifyRole('receptionist', {
      title: 'Visitor Overdue',
      message: `${visitor.name} was expected to leave at ${visitor.expectedCheckOut?.toLocaleTimeString() || 'N/A'} but has not checked out yet.`,
      type: 'gatekeeper_alert',
      relatedId: visitor._id,
      relatedModel: 'Visitor',
      priority: 'high',
    });
  }
}

module.exports = { startVisitorAlertCron };
