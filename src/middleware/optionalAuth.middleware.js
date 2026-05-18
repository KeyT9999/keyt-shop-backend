const jwt = require('jsonwebtoken');

/**
 * Optional authentication middleware.
 * Tries JWT Bearer token first — if valid, sets req.user.
 * If no token or invalid token, checks X-Session-ID header for UUID v4 format.
 * Does NOT fail — always calls next().
 */
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;

  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      // Token invalid/expired — fall through to session check
    }
  }

  // Check X-Session-ID header
  const sessionId = req.headers['x-session-id'];
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (sessionId && uuidV4Regex.test(sessionId)) {
    req.sessionId = sessionId;
  }

  next();
};

module.exports = { optionalAuth };
