const Visit = require('../models/visit.model');
const User = require('../models/user.model');

/**
 * Middleware để track lượt truy cập web
 * Lưu thông tin về IP, user agent, path, etc.
 */
const trackVisit = async (req, res, next) => {
  try {
    // Skip tracking cho admin routes và API routes (chỉ track public pages)
    const path = req.path;
    if (
      path.startsWith('/api/') ||
      path.startsWith('/admin') ||
      path === '/favicon.ico' ||
      path.startsWith('/_next') ||
      path.startsWith('/static')
    ) {
      return next();
    }

    // Lấy thông tin từ request
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.headers['x-real-ip'] || 
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     'unknown';
    
    const userAgent = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';
    
    // Parse user agent để lấy device type, browser, OS
    const deviceInfo = parseUserAgent(userAgent);
    
    // Lấy userId nếu đã đăng nhập (từ token)
    let userId = null;
    try {
      const header = req.headers.authorization;
      if (header && header.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const token = header.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id || null;
      }
    } catch (tokenErr) {
      // Token không hợp lệ hoặc không có - không sao, vẫn track visit
      userId = null;
    }

    // Tạo session ID từ IP + user agent (đơn giản)
    const sessionId = require('crypto')
      .createHash('md5')
      .update(`${ipAddress}-${userAgent}-${Date.now()}`)
      .digest('hex');

    // Lưu visit vào database (async, không block request)
    Visit.create({
      ipAddress,
      userAgent,
      path: path || '/',
      referrer,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      userId: userId || null,
      sessionId
    }).catch(err => {
      // Log error nhưng không block request
      console.warn('⚠️ Failed to track visit:', err.message);
    });

    next();
  } catch (err) {
    // Nếu có lỗi, vẫn tiếp tục request (không block)
    console.warn('⚠️ Error in visit tracker:', err.message);
    next();
  }
};

/**
 * Parse user agent string để lấy device type, browser, OS
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { deviceType: 'unknown', browser: '', os: '' };
  }

  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Detect browser
  let browser = '';
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  } else {
    browser = 'Unknown';
  }

  // Detect OS
  let os = '';
  if (ua.includes('windows')) {
    os = 'Windows';
  } else if (ua.includes('mac os') || ua.includes('macos')) {
    os = 'macOS';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
  } else {
    os = 'Unknown';
  }

  return { deviceType, browser, os };
}

module.exports = { trackVisit };
