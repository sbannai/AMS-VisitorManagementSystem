require('dotenv').config();
const http    = require('http');
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const rateLimit = require('express-rate-limit');

const connect = require('./config/db');
const { getDatabaseEngine } = require('./config/database');
const routes  = require('./routes/index');
const { initSocket } = require('./services/socket.service');
const { startVisitorAlertCron } = require('./services/visitorAlert.service');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_PATH || './uploads')));

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true }));
app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ success: false, message: 'File too large (max 5MB)' });
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the running backend or set PORT to another value in .env.`);
    process.exit(1);
  }

  console.error('Server error:', err);
  process.exit(1);
});

connect().then(() => {
  server.listen(PORT, () => {
    console.log(`\n🚀 School Management Server → http://localhost:${PORT}`);
    console.log(`📡 Socket.IO live on same port`);
    console.log(getDatabaseEngine() === 'mongodb'
      ? '\nLogin uses MongoDB users collection.\n'
      : `\n👤 Login uses existing EduChoice userprofiles records.\n`);
    startVisitorAlertCron();
  });
});
