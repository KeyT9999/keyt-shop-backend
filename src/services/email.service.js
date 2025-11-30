const { sendEmail } = require('../utils/email.util');
const { formatDate } = require('../utils/date.util');

class EmailService {
  /**
   * Send password reset email
   * @param {string} toEmail - Recipient email
   * @param {string} username - Username
   * @param {string} resetLink - Password reset link
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordResetEmail(toEmail, username, resetLink) {
    const subject = 'Đặt lại mật khẩu - Tiệm Tạp Hóa KeyT';
    const text = this.createPasswordResetEmailContent(username, resetLink);
    
    return await sendEmail({
      to: toEmail,
      subject,
      text
    });
  }

  /**
   * Create password reset email content
   * @param {string} username - Username
   * @param {string} resetLink - Reset link
   * @returns {string} - Email text content
   */
  createPasswordResetEmailContent(username, resetLink) {
    const now = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `Xin chào bạn iu ${username},

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại Tiệm Tạp Hóa KeyT.

Để đặt lại mật khẩu, vui lòng click vào link bên dưới:

🔗 LINK ĐẶT LẠI MẬT KHẨU:
${resetLink}

⚠️  Lưu ý quan trọng:
• Link này sẽ hết hạn sau 1 giờ
• Link chỉ có thể sử dụng 1 lần
• Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này

🔒 Bảo mật:
• Không chia sẻ link này với bất kỳ ai
• Đảm bảo bạn đang sử dụng thiết bị an toàn
• Sau khi đặt lại mật khẩu, hãy đăng xuất khỏi tất cả thiết bị khác

📞 Hỗ trợ:
Nếu bạn gặp vấn đề, vui lòng liên hệ:
• Zalo: 0868899104
• Email: support@keyt.com

Trân trọng,
🎯 Đội ngũ Tiệm Tạp Hóa KeyT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email này được gửi tự động, vui lòng không trả lời email này.
🔗 Website: https://mailapp-07zp.onrender.com
⏰ Thời gian gửi: ${now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Send welcome email
   * @param {string} toEmail - Recipient email
   * @param {string} username - Username
   * @returns {Promise<Object>} - Send result
   */
  async sendWelcomeEmail(toEmail, username) {
    const subject = 'Chào mừng bạn đến với Tiệm Tạp Hóa KeyT';
    const text = this.createWelcomeEmailContent(username);
    
    return await sendEmail({
      to: toEmail,
      subject,
      text
    });
  }

  /**
   * Create welcome email content
   * @param {string} username - Username
   * @returns {string} - Email text content
   */
  createWelcomeEmailContent(username) {
    const now = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `🎉 Xin chào ${username},

Chào mừng bạn đến với Tiệm Tạp Hóa KeyT!

✅ Tài khoản của bạn đã được tạo thành công.
🚀 Bạn có thể đăng nhập và bắt đầu sử dụng dịch vụ ngay bây giờ.

🎯 Các dịch vụ chính:
• Netflix Premium - 89K/tháng
• Canva Pro - 189K/năm
• Capcut Pro - 750K/năm
• Vieon VIP - 49K/tháng
• Google 2TB - 299K/năm
• Spotify Premium - 365K/năm

🔒 Bảo mật tài khoản:
• Sử dụng mật khẩu mạnh
• Không chia sẻ thông tin đăng nhập
• Đăng xuất sau khi sử dụng xong

📞 Hỗ trợ khách hàng:
• Zalo: 0868899104
• Email: support@keyt.com
• Thời gian hỗ trợ: 24/7

Trân trọng,
🎯 Đội ngũ Tiệm Tạp Hóa KeyT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email này được gửi tự động, vui lòng không trả lời email này.
🔗 Website: https://mailapp-07zp.onrender.com
⏰ Thời gian gửi: ${now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Send subscription expiry reminder to customer
   * @param {string} toEmail - Customer email
   * @param {string} serviceName - Service name
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} - Send result
   */
  async sendSubscriptionExpiryReminderToCustomer(toEmail, serviceName, endDate) {
    const endStr = formatDate(endDate);
    const subject = `[Nhắc nhở] Gói "${serviceName}" sẽ hết hạn vào ngày mai (${endStr}).`;
    const text = `💌 Hellooo bạn yêu 💕

Gói ${serviceName} của bạn sẽ hết hạn vào ngày ${endStr} đó ạ 🕒

Nếu muốn tiếp tục sử dụng, bạn cứ liên hệ sốp liền nha:
📱 Zalo: https://zalo.me/0868899104

📸 Instagram: https://www.instagram.com/taphoakeyt/

💖 Sốp chờ tin nhắn của ní đó ạ 💕`;

    return await sendEmail({
      to: toEmail,
      subject,
      text
    });
  }

  /**
   * Send subscription expiry digest to admin (T-1)
   * @param {Array} subscriptions - Subscriptions ending tomorrow
   * @returns {Promise<Object>} - Send result
   */
  async sendSubscriptionExpiryDigestToAdmin(subscriptions) {
    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, message: 'No subscriptions to notify' };
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'tiemtaphoakeyt@gmail.com';
    const subject = '[Dự báo] Danh sách gói hết hạn vào ngày mai.';
    
    const lines = subscriptions.map(s => {
      const endStr = formatDate(s.endDate);
      const zalo = s.contactZalo || '-';
      const instagram = s.contactInstagram || '-';
      return `- ${endStr} | ${s.serviceName} | KH: ${s.customerEmail} (Zalo: ${zalo}, IG: ${instagram})`;
    }).join('\n');

    const text = `Các dịch vụ hết hạn vào ngày mai:\n\n${lines}\n\n— Hệ thống MailApp`;

    return await sendEmail({
      to: adminEmail,
      subject,
      text
    });
  }

  /**
   * Send subscription expiry today digest to admin (T0)
   * @param {Array} subscriptions - Subscriptions ending today
   * @returns {Promise<Object>} - Send result
   */
  async sendSubscriptionExpiryTodayDigestToAdmin(subscriptions) {
    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, message: 'No subscriptions to notify' };
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'tiemtaphoakeyt@gmail.com';
    const subject = '[Hết hạn hôm nay] Danh sách gói hết hạn.';
    
    const lines = subscriptions.map(s => {
      const endStr = formatDate(s.endDate);
      const zalo = s.contactZalo || '-';
      const instagram = s.contactInstagram || '-';
      return `- ${endStr} | ${s.serviceName} | KH: ${s.customerEmail} (Zalo: ${zalo}, IG: ${instagram})`;
    }).join('\n');

    const text = `Các dịch vụ hết hạn hôm nay:\n\n${lines}\n\n— Hệ thống MailApp`;

    return await sendEmail({
      to: adminEmail,
      subject,
      text
    });
  }

  /**
   * Send password reset OTP email
   * @param {string} toEmail - Recipient email
   * @param {string} username - Username
   * @param {string} otp - OTP code
   * @returns {Promise<Object>} - Send result
   */
  async sendPasswordResetOtpEmail(toEmail, username, otp) {
    const subject = 'Mã OTP đặt lại mật khẩu - Tiệm Tạp Hóa KeyT';
    const text = this.createPasswordResetOtpEmailContent(username, otp);
    
    return await sendEmail({
      to: toEmail,
      subject,
      text
    });
  }

  /**
   * Send verification email with link
   * @param {string} toEmail
   * @param {string} username
   * @param {string} verifyLink
   */
  async sendEmailVerificationEmail(toEmail, username, verifyLink) {
    const subject = 'Xác minh email - Tiệm Tạp Hóa KeyT';
    const text = this.createEmailVerificationContent(username, verifyLink);

    return await sendEmail({
      to: toEmail,
      subject,
      text
    });
  }

  /**
   * Send password reset link email
   * @param {string} toEmail
   * @param {string} username
   * @param {string} resetLink
   */
  async sendPasswordResetLinkEmail(toEmail, username, resetLink) {
    const subject = 'Đặt lại mật khẩu - Tiệm Tạp Hóa KeyT';
    const text = this.createPasswordResetEmailContent(username, resetLink);

    return await sendEmail({
      to: toEmail,
      subject,
      text
    });
  }

  /**
   * Create password reset OTP email content
   * @param {string} username - Username
   * @param {string} otp - OTP code
   * @returns {string} - Email text content
   */
  createPasswordResetOtpEmailContent(username, otp) {
    const now = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `Xin chào bạn iu ${username},

Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại Tiệm Tạp Hóa KeyT.

🔐 MÃ OTP CỦA BẠN:
${otp}

⚠️  Lưu ý quan trọng:
• Mã OTP này sẽ hết hạn sau 15 phút
• Mã chỉ có thể sử dụng 1 lần
• Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này

🔒 Bảo mật:
• Không chia sẻ mã OTP này với bất kỳ ai
• Đảm bảo bạn đang sử dụng thiết bị an toàn
• Sau khi đặt lại mật khẩu, hãy đăng xuất khỏi tất cả thiết bị khác

📞 Hỗ trợ:
Nếu bạn gặp vấn đề, vui lòng liên hệ:
• Zalo: 0868899104
• Email: support@keyt.com

Trân trọng,
🎯 Đội ngũ Tiệm Tạp Hóa KeyT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email này được gửi tự động, vui lòng không trả lời email này.
🔗 Website: https://mailapp-07zp.onrender.com
⏰ Thời gian gửi: ${now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Create email verification content
   * @param {string} username
   * @param {string} verifyLink
   */
  createEmailVerificationContent(username, verifyLink) {
    const now = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return `Xin chào ${username},

🎉 Cảm ơn bạn đã đăng ký tài khoản tại Tiệm Tạp Hóa KeyT!

Để hoàn tất quá trình đăng ký và kích hoạt tài khoản, vui lòng xác minh email của bạn bằng cách nhấn vào link dưới đây:

🔗 LINK XÁC MINH:
${verifyLink}

⚠️ Lưu ý:
• Link chỉ có hiệu lực trong 24 giờ
• Nếu bạn không tạo tài khoản, hãy bỏ qua email này

Trân trọng,
🎯 Đội ngũ Tiệm Tạp Hóa KeyT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email này được gửi tự động, vui lòng không trả lời email này.
🔗 Website: https://mailapp-07zp.onrender.com
⏰ Thời gian gửi: ${now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}

module.exports = new EmailService();

