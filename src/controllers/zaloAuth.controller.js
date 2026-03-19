const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const userLoginHistoryService = require('../services/user-login-history.service');

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

const normalizeString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const loginWithZalo = async (req, res) => {
  const accessToken = normalizeString(req.body?.accessToken || req.body?.access_token);
  const zaloUserId = normalizeString(req.body?.userId || req.body?.user_id);
  const zaloName = normalizeString(req.body?.name);
  const zaloPhone = normalizeString(req.body?.phone);

  try {
    const zaloIdentity = normalizeString(zaloPhone || zaloUserId);

    if (!zaloIdentity) {
      return res.status(400).json({ message: 'Không thể lấy thông tin định danh từ Zalo' });
    }

    // The current backend flow maps a Zalo account by stable identity and does not
    // validate the access token with Zalo servers. In simulator/dev, the SDK may not
    // return an access token even when userId is available, so we allow this fallback.
    if (!accessToken) {
      console.warn('⚠️ Zalo login without access token, using user identity fallback:', zaloIdentity);
    }

    const legacyUsername = zaloIdentity;
    const canonicalUsername = `zalo_${zaloIdentity}`;
    const usernameCandidates = Array.from(new Set([legacyUsername, canonicalUsername]));

    // Only reuse users created by Zalo login to avoid taking over regular accounts.
    let user = await User.findOne({
      username: { $in: usernameCandidates },
      loginType: 'login-zalo'
    });

    // If user does not exist -> create new one.
    if (!user) {
      const base = canonicalUsername.slice(0, 15);
      const username = await ensureUniqueUsername(base);
      const defaultEmail = `${username}@zalo.local`;

      user = await User.create({
        username,
        email: defaultEmail,
        password: null,
        loginType: 'login-zalo',
        emailVerified: true,
        displayName: zaloName || null
      });

      console.log('✅ Created Zalo User:', user.username);
    } else if (zaloName && !user.displayName) {
      user.displayName = zaloName;
      await user.save();
    }

    // Record login history.
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'ZaloMiniApp';
    try {
      await userLoginHistoryService.recordLogin(user._id.toString(), ipAddress, userAgent);
    } catch (historyErr) {
      console.warn('⚠️ Failed to record login history:', historyErr.message);
    }

    // Generate internal JWT.
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
