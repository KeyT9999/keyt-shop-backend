const axios = require('axios');

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

function getRecaptchaSecret() {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    const error = new Error('RECAPTCHA_SECRET_KEY chưa được cấu hình.');
    error.code = 'MISSING_RECAPTCHA_SECRET';
    throw error;
  }
  return secret;
}

async function verifyRecaptchaToken(token, remoteIp) {
  const secret = getRecaptchaSecret();
  const params = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp) {
    params.append('remoteip', remoteIp);
  }

  const response = await axios.post(RECAPTCHA_VERIFY_URL, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000
  });

  return response.data;
}

module.exports = {
  verifyRecaptchaToken
};
