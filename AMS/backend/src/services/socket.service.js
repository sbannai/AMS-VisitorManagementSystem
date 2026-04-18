let io = null;
const userSockets = new Map(); // userId -> Set<socketId>

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }
  });

  io.on('connection', (socket) => {
    socket.on('authenticate', (userId) => {
      socket.userId = userId;
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId).add(socket.id);
      socket.join(`user:${userId}`);
      socket.emit('authenticated', { userId });
    });

    socket.on('disconnect', () => {
      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
      }
    });
  });

  console.log('🔌 Socket.IO initialised');
  return io;
}

function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
}

function emitToRole(event, data, allUsers) {
  if (!io) return;
  allUsers.forEach(u => emitToUser(u._id || u.id, event, data));
}

function getIO() { return io; }

module.exports = { initSocket, emitToUser, emitToRole, getIO };
