const { verifyRecaptchaToken } = require('../services/recaptcha.service');

const DEFAULT_ALLOWED_HOSTNAMES = ['taphoakeyt.com', 'localhost', '127.0.0.1'];
const DEFAULT_MIN_SCORE = 0.5;

function getClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return req.ip || req.connection?.remoteAddress;
}

function getAllowedHostnames() {
  const raw = process.env.RECAPTCHA_ALLOWED_HOSTNAMES;
  const values = raw ? raw.split(',') : DEFAULT_ALLOWED_HOSTNAMES;

  return values
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isHostnameAllowed(hostname) {
  const normalizedHostname = String(hostname || '').trim().toLowerCase();
  if (!normalizedHostname) {
    return false;
  }

  return getAllowedHostnames().some((allowedHostname) => {
    if (normalizedHostname === allowedHostname) {
      return true;
    }

    return normalizedHostname.endsWith(`.${allowedHostname}`);
  });
}

function getMinScore() {
  const parsed = Number(process.env.RECAPTCHA_MIN_SCORE || DEFAULT_MIN_SCORE);
  return Number.isFinite(parsed) ? parsed : DEFAULT_MIN_SCORE;
}

function requireRecaptcha(expectedAction) {
  return async (req, res, next) => {
    const recaptchaToken = req.body?.recaptchaToken;

    if (!recaptchaToken) {
      return res.status(400).json({ message: 'Vui lòng xác nhận reCAPTCHA.' });
    }

    try {
      const verification = await verifyRecaptchaToken(recaptchaToken, getClientIp(req));

      if (!verification?.success) {
        return res.status(400).json({
          message: 'Xác minh reCAPTCHA thất bại. Vui lòng thử lại.',
          codes: verification?.['error-codes'] || []
        });
      }

      if (expectedAction && verification.action !== expectedAction) {
        return res.status(400).json({
          message: 'Yêu cầu reCAPTCHA không hợp lệ. Vui lòng thử lại.'
        });
      }

      if (typeof verification.score !== 'number') {
        return res.status(400).json({
          message: 'Không nhận được điểm đánh giá reCAPTCHA hợp lệ.'
        });
      }

      if (verification.score < getMinScore()) {
        return res.status(400).json({
          message: 'reCAPTCHA đánh giá yêu cầu này là rủi ro cao. Vui lòng thử lại.'
        });
      }

      if (!isHostnameAllowed(verification.hostname)) {
        return res.status(400).json({
          message: 'Hostname của reCAPTCHA không hợp lệ.'
        });
      }

      req.recaptcha = {
        action: verification.action,
        score: verification.score,
        challengeTs: verification.challenge_ts,
        hostname: verification.hostname
      };

      return next();
    } catch (error) {
      console.error('reCAPTCHA verification failed:', error.message);

      if (error.code === 'MISSING_RECAPTCHA_SECRET') {
        return res.status(500).json({ message: error.message });
      }

      return res.status(502).json({
        message: 'Không thể xác minh reCAPTCHA lúc này. Vui lòng thử lại sau.'
      });
    }
  };
}

module.exports = {
  requireRecaptcha
};
