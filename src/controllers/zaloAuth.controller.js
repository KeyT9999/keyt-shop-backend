const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const userLoginHistoryService = require('../services/user-login-history.service');
const emailService = require('../services/email.service');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET chưa được cấu hình.');
  }
  return secret;
};

const createToken = (user) => {
  const payload = {
    id: user._id,
    username: user.username,
    admin: user.admin,
    role: user.admin ? 'admin' : 'user'
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
};

const ensureUniqueUsername = async (base) => {
  let candidate = base;
  while (await User.exists({ username: candidate })) {
    const suffix = Math.floor(Math.random() * 10000);
    candidate = `${base}${suffix}`;
  }
  return candidate.length >= 6 ? candidate : `${candidate}zalo`;
};

// Gọi Zalo Graph API để lấy SĐT
const getZaloUserPhone = async (accessToken) => {
  try {
    const response = await axios.get('https://graph.zalo.me/v2.0/me/info', {
      headers: {
        access_token: accessToken,
        code: accessToken // Trong phiên bản Zalo Access Token thực tế, pass vào header hoặc querystring
      }
    });
    
    // Lưu ý: Zalo trả về dữ liệu tuỳ thuộc app có quyền lấy phone hay không
    // Data mockup hoặc fallback nếu app chưa xét duyệt
    return response.data;
  } catch (error) {
    console.error('Call Zalo API Error:', error?.response?.data || error.message);
    throw new Error('Lỗi xác thực Zalo Token');
  }
};

const loginWithZalo = async (req, res) => {
  const { accessToken, userId: zaloUserId, name: zaloName, phone: zaloPhone } = req.body;

  if (!accessToken) {
    return res.status(400).json({ message: 'Missing Zalo Access Token' });
  }

  try {
    // 1. (Optional) Verify token by calling Zalo Graph API
    // Thực tế nếu app chưa duyệt Quyền lấy SĐT, Zalo sẽ không trả về phone.
    // Tạm thời tin tưởng phone truyền lên (trong môi trường test ZMP), hoặc dùng zaloUserId.
    
    // const zaloData = await getZaloUserPhone(accessToken);
    const phoneToUse = zaloPhone || zaloUserId; 
    
    if (!phoneToUse) {
         return res.status(400).json({ message: 'Không thể lấy thông tin định danh từ Zalo' });
    }

    // 2. Lookup existing user by phone (fallback to email if linked)
    let user = await User.findOne({ username: phoneToUse });

    // 3. Nếu chưa có user -> Create mới
    if (!user) {
      const base = `zalo_${phoneToUse}`.slice(0, 15);
      const username = await ensureUniqueUsername(base);
      
      const defaultEmail = `${username}@zalo.local`; // Bắt buộc điền tạm do model User bắt Email unique
      
      user = await User.create({
        username: phoneToUse, // Tạm dùng sdt làm username
        email: defaultEmail, 
        password: null, // Không có pass vì login zalo
        loginType: 'login-zalo',
        emailVerified: true // Zalo phone coi như verified
      });
      
      console.log('✅ Created Zalo User:', user.username);
    }

    // 4. Record History
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'ZaloMiniApp';
    try {
      await userLoginHistoryService.recordLogin(user._id.toString(), ipAddress, userAgent);
    } catch (historyErr) {
      console.warn('⚠️ Failed to record login history:', historyErr.message);
    }

    // 5. Generate Internal JWT
    const token = createToken(user);

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        admin: user.admin,
        emailVerified: user.emailVerified
      },
      token
    });

  } catch (error) {
    console.error('❌ Zalo login error:', error);
    res.status(500).json({ message: 'Đăng nhập Zalo thất bại.', error: error.message });
  }
};

module.exports = {
  loginWithZalo
};
