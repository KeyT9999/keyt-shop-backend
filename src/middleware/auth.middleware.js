const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token không được cung cấp.' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // Log chi tiết lỗi để debug
    console.error('❌ Token verification error:', {
      name: err.name,
      message: err.message,
      path: req.path,
      method: req.method
    });
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token không hợp lệ.',
        code: 'TOKEN_INVALID'
      });
    }
    return res.status(401).json({ 
      message: 'Token không hợp lệ hoặc đã hết hạn.',
      code: 'TOKEN_ERROR'
    });
  }
};

const authorize = (role = 'user') => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập.' });
  }

  if (role === 'admin' && !req.user.admin) {
    return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
  }

  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.admin) {
    return res.status(403).json({ message: 'Yêu cầu quyền Admin.' });
  }
  next();
};

module.exports = { authenticateToken, authorize, requireAdmin };

