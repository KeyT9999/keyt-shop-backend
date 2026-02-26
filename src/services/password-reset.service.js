const User = require('../models/user.model');
const emailService = require('./email.service');
const tokenService = require('./token.service');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://taphoakeyt.com';
const RESET_PATH = '/reset-password';

class PasswordResetService {
  async requestPasswordReset(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { success: true, message: 'Nếu email tồn tại, link đặt lại đã được gửi.' };
    }

    if (user.loginType === 'login-google' && !user.password) {
      return { success: false, message: 'Tài khoản Google không thể đặt lại mật khẩu.' };
    }

    const token = tokenService.generateToken();
    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const resetLink = `${FRONTEND_URL}${RESET_PATH}?token=${token}`;
    await emailService.sendPasswordResetLinkEmail(user.email, user.username, resetLink);

    return { success: true, message: 'Link đặt lại mật khẩu đã được gửi tới email của bạn.' };
  }

  async resetPasswordWithToken(token, newPassword) {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return { success: false, message: 'Link đặt lại không hợp lệ hoặc đã hết hạn.' };
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return { success: true, message: 'Đặt lại mật khẩu thành công.' };
  }
}

module.exports = new PasswordResetService();

