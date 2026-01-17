const rateLimit = require('express-rate-limit');

/**
 * Rate limiter cho register
 * Tối đa 5 lần register trong 15 phút
 */
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // tối đa 5 lần register trong 15 phút
  message: { message: 'Quá nhiều lần đăng ký. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting trong development nếu cần
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

/**
 * Rate limiter cho order creation
 * Tối đa 10 orders trong 15 phút
 */
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // tối đa 10 orders trong 15 phút
  message: { message: 'Quá nhiều đơn hàng. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

/**
 * Rate limiter cho review creation
 * Tối đa 10 reviews trong 15 phút
 */
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // tối đa 10 reviews trong 15 phút
  message: { message: 'Quá nhiều đánh giá. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

/**
 * Rate limiter cho password reset
 * Tối đa 3 lần reset password trong 1 giờ
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3, // tối đa 3 lần reset password trong 1 giờ
  message: { message: 'Quá nhiều lần yêu cầu reset mật khẩu. Vui lòng thử lại sau 1 giờ.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

/**
 * Rate limiter cho email verification
 * Tối đa 3 lần gửi email verification trong 1 giờ
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 3, // tối đa 3 lần gửi email verification trong 1 giờ
  message: { message: 'Quá nhiều lần yêu cầu xác minh email. Vui lòng thử lại sau 1 giờ.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development' && process.env.SKIP_RATE_LIMIT === 'true';
  }
});

module.exports = {
  registerLimiter,
  orderLimiter,
  reviewLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
};
