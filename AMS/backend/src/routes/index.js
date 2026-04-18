const express = require('express');
const router  = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const authCtrl   = require('../controllers/auth.controller');
const apptCtrl   = require('../controllers/appointment.controller');
const visitCtrl  = require('../controllers/visitor.controller');
const notifCtrl  = require('../controllers/notification.controller');

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login',   authCtrl.login);
router.get('/auth/profile',  authenticate, authCtrl.getProfile);
router.get('/users',         authenticate, authCtrl.getUsers);

// ── Dashboard / stats ─────────────────────────────────────────────────────────
router.get('/appointments/stats', authenticate, apptCtrl.getStats);
router.get('/visitors/stats',     authenticate, visitCtrl.getStats);

// ── Appointments ──────────────────────────────────────────────────────────────
router.get('/appointments',     authenticate, apptCtrl.getAll);
router.post('/appointments',    authenticate, requireRole('parent'), apptCtrl.create);
router.get('/appointments/:id', authenticate, apptCtrl.getOne);
router.patch('/appointments/:id/accept',   authenticate, requireRole('teacher'), apptCtrl.accept);
router.patch('/appointments/:id/decline',  authenticate, requireRole('teacher'), apptCtrl.decline);
router.patch('/appointments/:id/complete', authenticate, requireRole('teacher'), apptCtrl.complete);
router.patch('/appointments/:id/cancel',   authenticate, requireRole('parent'),  apptCtrl.cancel);

// ── Visitors ──────────────────────────────────────────────────────────────────
router.get('/visitors',     authenticate, visitCtrl.getAll);
router.post('/visitors',    authenticate, requireRole('receptionist','admin'), upload.single('photo'), visitCtrl.register);
router.get('/visitors/:id', authenticate, visitCtrl.getOne);
router.patch('/visitors/:id/complete-meeting', authenticate, requireRole('teacher','receptionist','admin'), visitCtrl.completeMeeting);
router.patch('/visitors/:id/checkout',         authenticate, requireRole('gatekeeper','receptionist','admin'), visitCtrl.checkout);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications',          authenticate, notifCtrl.getAll);
router.patch('/notifications/read',   authenticate, notifCtrl.markRead);
router.patch('/notifications/:id/read', authenticate, notifCtrl.markOneRead);

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

module.exports = router;
