const cron = require('node-cron');
const Visitor = require('../models/Visitor');
const { createNotification, notifyRole } = require('./notification.service');
require('dotenv').config();

const ALERT_MINUTES = parseInt(process.env.VISITOR_ALERT_MINUTES) || 10;

function startVisitorAlertCron() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // 1. Mark overdue: meeting_complete but not checked out within ALERT_MINUTES
      const overdueWindow = new Date(now.getTime() - ALERT_MINUTES * 60 * 1000);

      const overdueVisitors = await Visitor.find({
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

        // Alert gatekeepers
        await notifyRole('gatekeeper', {
          title: '🚨 MISSING VISITOR ALERT',
          message: `${visitor.name} (${visitor.vehicleNumber || 'No vehicle'}) came to meet ${visitor.personToMeet}. Meeting was marked complete ${minutesOver} minutes ago but visitor has NOT checked out. Immediate action required!`,
          type: 'visitor_missing',
          relatedId: visitor._id,
          relatedModel: 'Visitor',
          priority: 'urgent',
        });

        // Also alert receptionist
        await notifyRole('receptionist', {
          title: '🚨 MISSING VISITOR — Action Required',
          message: `Visitor ${visitor.name} (Vehicle: ${visitor.vehicleNumber || 'N/A'}) has been on premises for ${minutesOver} minutes after meeting completion. Gatekeeper has been alerted.`,
          type: 'visitor_missing',
          relatedId: visitor._id,
          relatedModel: 'Visitor',
          priority: 'urgent',
        });

        // Alert admin
        await notifyRole('admin', {
          title: '⚠️ Missing Visitor Alert Triggered',
          message: `System auto-alert: ${visitor.name} has not exited after meeting with ${visitor.personToMeet}. Alert sent to gatekeeper at ${now.toLocaleTimeString()}.`,
          type: 'visitor_missing',
          relatedId: visitor._id,
          relatedModel: 'Visitor',
          priority: 'high',
        });

        console.log(`🚨 Missing visitor alert sent for: ${visitor.name}`);
      }

      // 2. Mark overdue visitors past their expected check-out
      const expectedOverdue = await Visitor.find({
        status: 'checked_in',
        expectedCheckOut: { $lte: now },
        missingAlertSent: false,
      });

      for (const visitor of expectedOverdue) {
        visitor.status = 'overdue';
        await visitor.save();

        await notifyRole('receptionist', {
          title: '⏰ Visitor Overdue',
          message: `${visitor.name} was expected to leave at ${visitor.expectedCheckOut?.toLocaleTimeString() || 'N/A'} but has not checked out yet.`,
          type: 'gatekeeper_alert',
          relatedId: visitor._id,
          relatedModel: 'Visitor',
          priority: 'high',
        });
      }

    } catch (err) {
      console.error('Visitor cron error:', err.message);
    }
  });

  console.log(`⏰ Visitor alert cron started (${ALERT_MINUTES} min threshold)`);
}

module.exports = { startVisitorAlertCron };
