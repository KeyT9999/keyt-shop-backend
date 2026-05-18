const { Server } = require('socket.io');
const { socketAuth } = require('./auth');
const { registerChatHandlers } = require('./handlers/chatHandlers');

let io;

/**
 * Initialize Socket.io server attached to HTTP server
 * @param {import('http').Server} server - HTTP server instance
 * @returns {import('socket.io').Server} Socket.io server instance
 */
function initSocket(server) {
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://www.taphoakeyt.com',
    'https://taphoakeyt.com',
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app'))) {
          callback(null, true);
        } else {
          callback(null, process.env.NODE_ENV !== 'production');
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Apply authentication middleware
  io.use(socketAuth);

  // Register event handlers
  io.on('connection', (socket) => {
    registerChatHandlers(io, socket);
  });

  return io;
}

/**
 * Get the Socket.io server instance
 * @returns {import('socket.io').Server|undefined}
 */
function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
