const jwt = require('jsonwebtoken');

/**
 * Socket.io authentication middleware
 * Verifies admin JWT tokens or validates customer session IDs
 * @param {import('socket.io').Socket} socket
 * @param {Function} next
 */
function socketAuth(socket, next) {
  const { token, sessionId, role } = socket.handshake.auth;
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (role === 'admin') {
    if (!token) {
      return next(new Error('AUTH_REQUIRED'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      socket.userRole = 'admin';
    } catch (err) {
      return next(new Error('AUTH_EXPIRED'));
    }
  } else {
    // Customer connection - validate sessionId format (UUID v4)
    if (!sessionId || !uuidV4Regex.test(sessionId)) {
      return next(new Error('AUTH_INVALID'));
    }
    socket.sessionId = sessionId;
    socket.userRole = 'customer';

    if (token) {
      try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return next(new Error(err.name === 'TokenExpiredError' ? 'AUTH_EXPIRED' : 'AUTH_INVALID'));
      }
    }
  }

  next();
}

module.exports = { socketAuth };
