const { sendEmail } = require('../utils/email.util');
const { formatDate } = require('../utils/date.util');

class EmailService {
  /**
   * Get admin email from environment variable
   * @returns {string} - Admin email address
   */
  getAdminEmail() {
    const adminEmail = process.env.ADMIN_EMAIL || 'trankimthang0207@gmail.com';
    if (!adminEmail) {
      console.warn('⚠️ ADMIN_EMAIL not set in environment variables, using default');
    }
    return adminEmail;
  }

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

    const frontendUrl = process.env.FRONTEND_URL || 'https://mailapp-07zp.onrender.com';

    return `🎉 Xin chào ${username},

Chào mừng bạn đến với Tiệm Tạp Hóa KeyT!

✅ Tài khoản của bạn đã được tạo thành công.
🚀 Bạn có thể đăng nhập và bắt đầu sử dụng dịch vụ ngay bây giờ.

🎯 Khám phá dịch vụ:
• Vui lòng truy cập website để xem danh sách và giá các dịch vụ
• Website: ${frontendUrl}

🔒 Bảo mật tài khoản:
• Sử dụng mật khẩu mạnh
• Không chia sẻ thông tin đăng nhập
• Đăng xuất sau khi sử dụng xong

📞 Hỗ trợ khách hàng:
• Zalo: 0868899104
• Email: tiemtaphoakeyt@gmail.com
• Thời gian hỗ trợ: 24/7

Trân trọng,
🎯 Đội ngũ Tiệm Tạp Hóa KeyT

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email này được gửi tự động, vui lòng không trả lời email này.
🔗 Website: ${frontendUrl}
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

    const adminEmail = this.getAdminEmail();
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

    const adminEmail = this.getAdminEmail();
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

  /**
   * Helper function to format price
   */
  formatPrice(amount, currency = 'VND') {
    if (currency === 'VND') {
      return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  /**
   * Helper function to create email footer
   */
  createEmailFooter() {
    const now = new Date().toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email này được gửi tự động, vui lòng không trả lời email này.
🔗 Website: ${frontendUrl}
📞 Hỗ trợ Zalo: https://zalo.me/84868899104
⏰ Thời gian gửi: ${now}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Helper function to create HTML email wrapper
   */
  createHtmlEmailWrapper(content, title) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">🎯 Tiệm Tạp Hóa KeyT</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 20px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5; font-size: 12px; color: #6b7280;">
              <p style="margin: 5px 0;">📧 Email tự động - Không trả lời email này</p>
              <p style="margin: 5px 0;">📞 Hỗ trợ: <a href="https://zalo.me/84868899104" style="color: #2563eb;">Zalo 0868899104</a></p>
              <p style="margin: 5px 0;">🔗 Website: ${process.env.FRONTEND_URL || 'http://localhost:5173'}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Send order created email to user
   * @param {Object} order - Order object
   */
  async sendOrderCreatedEmailToUser(order) {
    const orderNumber = order.orderCode;
    const subject = `Xác nhận đơn hàng #${orderNumber} - Tiệm Tạp Hóa KeyT`;

    const itemsHtml = order.items.map((item, index) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right;">${this.formatPrice(item.price, item.currency)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600;">${this.formatPrice(item.price * item.quantity, item.currency)}</td>
      </tr>
    `).join('');

    const paymentButton = order.checkoutUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${order.checkoutUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          💳 Thanh toán ngay
        </a>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center; margin-top: 15px;">
        ⏰ Link thanh toán có hiệu lực trong 24 giờ. Vui lòng thanh toán sớm để đơn hàng được xử lý nhanh chóng.
      </p>
    ` : `
      <p style="color: #d97706; font-size: 14px; text-align: center; padding: 15px; background-color: #fef3c7; border-radius: 6px;">
        ⚠️ Link thanh toán đang được tạo. Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.
      </p>
    `;

    const content = `
      <h2 style="color: #1f2937; margin-top: 0;">🎉 Cảm ơn bạn đã đặt hàng!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Chúng tôi đã nhận được đơn hàng của bạn. Đơn hàng đang chờ thanh toán.
      </p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Mã đơn hàng</p>
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #2563eb;">#${orderNumber}</p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
          Ngày đặt: ${new Date(order.createdAt).toLocaleString('vi-VN')}
        </p>
      </div>

      <h3 style="color: #1f2937; margin-top: 30px;">📦 Chi tiết đơn hàng</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">STT</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Sản phẩm</th>
            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">SL</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Đơn giá</th>
            <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding: 15px 12px; text-align: right; font-weight: 600; color: #374151; border-top: 2px solid #e5e5e5;">Tổng tiền:</td>
            <td style="padding: 15px 12px; text-align: right; font-weight: 700; font-size: 18px; color: #2563eb; border-top: 2px solid #e5e5e5;">${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}</td>
          </tr>
        </tfoot>
      </table>

      ${paymentButton}

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>📋 Bước tiếp theo:</strong><br>
          1. Thanh toán đơn hàng bằng link trên<br>
          2. Đơn hàng sẽ được xác nhận sau khi thanh toán thành công<br>
          3. Bạn sẽ nhận được email thông báo khi đơn hàng được xử lý
        </p>
      </div>

      ${order.note ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 5px 0; font-weight: 600; color: #92400e;">📝 Ghi chú của bạn:</p>
          <p style="margin: 0; color: #78350f; white-space: pre-line;">${order.note}</p>
        </div>
      ` : ''}
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = this.createOrderCreatedEmailTextContent(order);

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Create text version of order created email
   */
  createOrderCreatedEmailTextContent(order) {
    const orderNumber = order.orderCode;
    const itemsText = order.items.map((item, index) =>
      `${index + 1}. ${item.name} x${item.quantity} - ${this.formatPrice(item.price, item.currency)} = ${this.formatPrice(item.price * item.quantity, item.currency)}`
    ).join('\n');

    return `🎉 Cảm ơn bạn đã đặt hàng!

Xin chào ${order.customer.name},

Chúng tôi đã nhận được đơn hàng của bạn. Đơn hàng đang chờ thanh toán.

Mã đơn hàng: #${orderNumber}
Ngày đặt: ${new Date(order.createdAt).toLocaleString('vi-VN')}

📦 Chi tiết đơn hàng:
${itemsText}

Tổng tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}

${order.checkoutUrl ? `💳 Link thanh toán: ${order.checkoutUrl}\n\n⏰ Link thanh toán có hiệu lực trong 24 giờ.` : '⚠️ Link thanh toán đang được tạo. Vui lòng kiểm tra lại sau.'}

📋 Bước tiếp theo:
1. Thanh toán đơn hàng bằng link trên
2. Đơn hàng sẽ được xác nhận sau khi thanh toán thành công
3. Bạn sẽ nhận được email thông báo khi đơn hàng được xử lý

${order.note ? `📝 Ghi chú của bạn:\n${order.note}\n` : ''}${this.createEmailFooter()}`;
  }

  /**
   * Send order created email to admin
   * @param {Object} order - Order object
   */
  async sendOrderCreatedEmailToAdmin(order) {
    const adminEmail = this.getAdminEmail();
    const orderNumber = order.orderCode;
    const subject = `[Đơn hàng mới] #${orderNumber} - ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}`;

    const itemsHtml = order.items.map((item, index) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center;">${index + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">${this.formatPrice(item.price, item.currency)}</td>
      </tr>
    `).join('');

    const requiredFieldsHtml = order.items.some(item => item.requiredFieldsData && item.requiredFieldsData.length > 0)
      ? order.items.map((item, itemIndex) => {
        if (!item.requiredFieldsData || item.requiredFieldsData.length === 0) return '';
        return `
            <div style="margin-top: 10px; padding: 10px; background-color: #fef3c7; border-radius: 6px; border-left: 3px solid #f59e0b;">
              <strong>${item.name}:</strong>
              ${item.requiredFieldsData.map(field => `
                <p style="margin: 5px 0; font-size: 14px;">• <strong>${field.label}:</strong> ${field.value}</p>
              `).join('')}
            </div>
          `;
      }).filter(html => html).join('')
      : '';

    const adminUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/admin/orders/${order._id}` : `http://localhost:5173/admin/orders/${order._id}`;

    const content = `
      <h2 style="color: #dc2626; margin-top: 0;">🔔 Đơn hàng mới cần xử lý</h2>
      
      <div style="background-color: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #991b1b;">Mã đơn hàng: #${orderNumber}</p>
        <p style="margin: 0; font-size: 14px; color: #7f1d1d;">
          Ngày đặt: ${new Date(order.createdAt).toLocaleString('vi-VN')}
        </p>
      </div>

      <h3 style="color: #1f2937; margin-top: 25px;">👤 Thông tin khách hàng</h3>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Tên:</strong> ${order.customer.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${order.customer.email}</p>
        <p style="margin: 5px 0;"><strong>Số điện thoại:</strong> ${order.customer.phone}</p>
      </div>

      <h3 style="color: #1f2937; margin-top: 25px;">📦 Sản phẩm</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">STT</th>
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Sản phẩm</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">SL</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Đơn giá</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding: 12px; text-align: right; font-weight: 600; color: #374151; border-top: 2px solid #e5e5e5;">Tổng tiền:</td>
            <td style="padding: 12px; text-align: right; font-weight: 700; font-size: 16px; color: #dc2626; border-top: 2px solid #e5e5e5;">${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}</td>
          </tr>
        </tfoot>
      </table>

      ${requiredFieldsHtml ? `
        <h3 style="color: #1f2937; margin-top: 25px;">⚠️ Thông tin bổ sung từ khách hàng</h3>
        ${requiredFieldsHtml}
      ` : ''}

      ${order.note ? `
        <h3 style="color: #1f2937; margin-top: 25px;">📝 Ghi chú khách hàng</h3>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #78350f; white-space: pre-line;">${order.note}</p>
        </div>
      ` : ''}

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #1e40af;">Trạng thái:</p>
        <p style="margin: 5px 0; color: #1e40af;">
          • Đơn hàng: <strong>${order.orderStatus === 'pending' ? 'Chờ xử lý' : order.orderStatus}</strong><br>
          • Thanh toán: <strong>${order.paymentStatus === 'pending' ? 'Chờ thanh toán' : order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Thất bại'}</strong>
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          🔗 Xem và xử lý đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = this.createOrderCreatedEmailToAdminTextContent(order);

    return await sendEmail({
      to: adminEmail,
      subject,
      text,
      html
    });
  }

  /**
   * Create text version of order created email to admin
   */
  createOrderCreatedEmailToAdminTextContent(order) {
    const orderNumber = order.orderCode;
    const itemsText = order.items.map((item, index) =>
      `${index + 1}. ${item.name} x${item.quantity} - ${this.formatPrice(item.price, item.currency)}`
    ).join('\n');

    const requiredFieldsText = order.items.some(item => item.requiredFieldsData && item.requiredFieldsData.length > 0)
      ? '\n\n⚠️ Thông tin bổ sung:\n' + order.items.map(item => {
        if (!item.requiredFieldsData || item.requiredFieldsData.length === 0) return '';
        return `${item.name}:\n` + item.requiredFieldsData.map(field => `  • ${field.label}: ${field.value}`).join('\n');
      }).filter(text => text).join('\n\n')
      : '';

    const adminUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/admin/orders/${order._id}` : `http://localhost:5173/admin/orders/${order._id}`;

    return `🔔 Đơn hàng mới cần xử lý

Mã đơn hàng: #${orderNumber}
Ngày đặt: ${new Date(order.createdAt).toLocaleString('vi-VN')}

👤 Thông tin khách hàng:
Tên: ${order.customer.name}
Email: ${order.customer.email}
Số điện thoại: ${order.customer.phone}

📦 Sản phẩm:
${itemsText}

Tổng tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}
${requiredFieldsText}
${order.note ? `\n📝 Ghi chú khách hàng:\n${order.note}\n` : ''}
Trạng thái:
• Đơn hàng: ${order.orderStatus === 'pending' ? 'Chờ xử lý' : order.orderStatus}
• Thanh toán: ${order.paymentStatus === 'pending' ? 'Chờ thanh toán' : order.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Thất bại'}

🔗 Xem và xử lý: ${adminUrl}
${this.createEmailFooter()}`;
  }

  /**
   * Send payment success email to user
   * @param {Object} order - Order object
   */
  async sendPaymentSuccessEmailToUser(order) {
    const orderNumber = order.orderCode;
    const subject = `Thanh toán thành công - Đơn hàng #${orderNumber}`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;

    const content = `
      <h2 style="color: #059669; margin-top: 0;">✅ Thanh toán thành công!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Chúng tôi đã nhận được thanh toán của bạn cho đơn hàng <strong>#${orderNumber}</strong>.
      </p>
      
      <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #065f46; font-weight: 600;">Số tiền đã thanh toán:</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #059669;">${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}</p>
      </div>

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>📋 Bước tiếp theo:</strong><br>
          • Đơn hàng của bạn đang chờ admin xác nhận<br>
          • Thời gian xử lý dự kiến: 1-2 giờ làm việc<br>
          • Bạn sẽ nhận được email thông báo khi đơn hàng được xác nhận và xử lý
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${orderUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          👁️ Xem chi tiết đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `✅ Thanh toán thành công!

Xin chào ${order.customer.name},

Chúng tôi đã nhận được thanh toán của bạn cho đơn hàng #${orderNumber}.

Số tiền đã thanh toán: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}

📋 Bước tiếp theo:
• Đơn hàng của bạn đang chờ admin xác nhận
• Thời gian xử lý dự kiến: 1-2 giờ làm việc
• Bạn sẽ nhận được email thông báo khi đơn hàng được xác nhận và xử lý

Xem chi tiết: ${orderUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send payment success email to admin
   * @param {Object} order - Order object
   */
  async sendPaymentSuccessEmailToAdmin(order) {
    const adminEmail = this.getAdminEmail();
    const orderNumber = order.orderCode;
    const subject = `[Thanh toán thành công] Đơn hàng #${orderNumber} - ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}`;

    const adminUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/admin/orders/${order._id}` : `http://localhost:5173/admin/orders/${order._id}`;

    const content = `
      <h2 style="color: #059669; margin-top: 0;">💰 Đơn hàng đã thanh toán</h2>
      
      <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
        <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #065f46;">Mã đơn hàng: #${orderNumber}</p>
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #059669;">
          Số tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}
        </p>
      </div>

      <h3 style="color: #1f2937; margin-top: 25px;">👤 Thông tin khách hàng</h3>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Tên:</strong> ${order.customer.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${order.customer.email}</p>
        <p style="margin: 5px 0;"><strong>Số điện thoại:</strong> ${order.customer.phone}</p>
      </div>

      <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>⚠️ Lưu ý:</strong> Đơn hàng đã thanh toán, cần xác nhận và xử lý sớm.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          🔗 Xem và xử lý đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `💰 Đơn hàng đã thanh toán

Mã đơn hàng: #${orderNumber}
Số tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}

👤 Thông tin khách hàng:
Tên: ${order.customer.name}
Email: ${order.customer.email}
Số điện thoại: ${order.customer.phone}

⚠️ Lưu ý: Đơn hàng đã thanh toán, cần xác nhận và xử lý sớm.

🔗 Xem và xử lý: ${adminUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: adminEmail,
      subject,
      text,
      html
    });
  }

  /**
   * Send order confirmed email to user
   * @param {Object} order - Order object
   */
  async sendOrderConfirmedEmailToUser(order) {
    const orderNumber = order.orderCode;
    const subject = `Đơn hàng #${orderNumber} đã được xác nhận`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;
    const confirmedBy = typeof order.confirmedBy === 'object' && order.confirmedBy ? order.confirmedBy.username : 'Admin';

    const content = `
      <h2 style="color: #7c3aed; margin-top: 0;">✓ Đơn hàng đã được xác nhận!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Đơn hàng <strong>#${orderNumber}</strong> của bạn đã được xác nhận bởi ${confirmedBy}.
      </p>
      
      <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #5b21b6; font-weight: 600;">Thời gian xác nhận:</p>
        <p style="margin: 0; font-size: 16px; color: #6d28d9;">
          ${order.confirmedAt ? new Date(order.confirmedAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
        </p>
      </div>

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>📋 Bước tiếp theo:</strong><br>
          • Admin đang chuẩn bị xử lý đơn hàng của bạn<br>
          • Thời gian xử lý dự kiến: 1-2 giờ làm việc<br>
          • Bạn sẽ nhận được email thông báo khi đơn hàng bắt đầu được xử lý
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${orderUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          👁️ Xem chi tiết đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `✓ Đơn hàng đã được xác nhận!

Xin chào ${order.customer.name},

Đơn hàng #${orderNumber} của bạn đã được xác nhận bởi ${confirmedBy}.

Thời gian xác nhận: ${order.confirmedAt ? new Date(order.confirmedAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}

📋 Bước tiếp theo:
• Admin đang chuẩn bị xử lý đơn hàng của bạn
• Thời gian xử lý dự kiến: 1-2 giờ làm việc
• Bạn sẽ nhận được email thông báo khi đơn hàng bắt đầu được xử lý

Xem chi tiết: ${orderUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send order processing email to user
   * @param {Object} order - Order object
   */
  async sendOrderProcessingEmailToUser(order) {
    const orderNumber = order.orderCode;
    const subject = `Đơn hàng #${orderNumber} đang được xử lý`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;

    const itemsList = order.items.map(item => `• ${item.name} x${item.quantity}`).join('<br>');

    const content = `
      <h2 style="color: #2563eb; margin-top: 0;">⚙️ Đơn hàng đang được xử lý</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Đơn hàng <strong>#${orderNumber}</strong> của bạn đã bắt đầu được xử lý.
      </p>
      
      <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af; font-weight: 600;">Thời gian bắt đầu xử lý:</p>
        <p style="margin: 0; font-size: 16px; color: #1d4ed8;">
          ${order.processingAt ? new Date(order.processingAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151;">📦 Sản phẩm đang được xử lý:</p>
        <p style="margin: 0; color: #6b7280; line-height: 1.8;">
          ${itemsList}
        </p>
      </div>

      <div style="background-color: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
        <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
          <strong>✨ Thông tin:</strong><br>
          • Đơn hàng sẽ hoàn thành sớm<br>
          • Bạn sẽ nhận được email thông báo khi đơn hàng hoàn thành<br>
          • Nếu có thông tin sản phẩm/dịch vụ, bạn sẽ nhận được trong email tiếp theo
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${orderUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          👁️ Xem chi tiết đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `⚙️ Đơn hàng đang được xử lý

Xin chào ${order.customer.name},

Đơn hàng #${orderNumber} của bạn đã bắt đầu được xử lý.

Thời gian bắt đầu xử lý: ${order.processingAt ? new Date(order.processingAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}

📦 Sản phẩm đang được xử lý:
${order.items.map(item => `• ${item.name} x${item.quantity}`).join('\n')}

✨ Thông tin:
• Đơn hàng sẽ hoàn thành sớm
• Bạn sẽ nhận được email thông báo khi đơn hàng hoàn thành
• Nếu có thông tin sản phẩm/dịch vụ, bạn sẽ nhận được trong email tiếp theo

Xem chi tiết: ${orderUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send order completed email to user
   * @param {Object} order - Order object
   */
  async sendOrderCompletedEmailToUser(order) {
    const orderNumber = order.orderCode;
    const subject = `🎉 Đơn hàng #${orderNumber} đã hoàn thành!`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;
    const reviewUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;

    const itemsList = order.items.map(item => {
      let itemInfo = `• <strong>${item.name}</strong> x${item.quantity}`;
      if (item.requiredFieldsData && item.requiredFieldsData.length > 0) {
        itemInfo += '<br>' + item.requiredFieldsData.map(field =>
          `  └ ${field.label}: <strong>${field.value}</strong>`
        ).join('<br>');
      }
      return itemInfo;
    }).join('<br><br>');

    const content = `
      <h2 style="color: #059669; margin-top: 0;">🎉 Đơn hàng đã hoàn thành!</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Đơn hàng <strong>#${orderNumber}</strong> của bạn đã được hoàn thành thành công!
      </p>
      
      <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #065f46; font-weight: 600;">Thời gian hoàn thành:</p>
        <p style="margin: 0; font-size: 16px; color: #059669;">
          ${order.completedAt ? new Date(order.completedAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0; font-weight: 600; color: #374151;">📦 Chi tiết sản phẩm/dịch vụ:</p>
        <div style="color: #6b7280; line-height: 1.8;">
          ${itemsList}
        </div>
      </div>

      <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
          <strong>💡 Hướng dẫn sử dụng:</strong><br>
          • Vui lòng kiểm tra thông tin sản phẩm/dịch vụ ở trên<br>
          • Nếu có vấn đề, vui lòng liên hệ hỗ trợ qua Zalo: <a href="https://zalo.me/84868899104" style="color: #2563eb;">0868899104</a><br>
          • Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${reviewUrl}" style="display: inline-block; padding: 15px 30px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin-right: 10px;">
          ⭐ Đánh giá sản phẩm
        </a>
        <a href="${orderUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          👁️ Xem chi tiết đơn hàng
        </a>
      </div>

      <div style="background-color: #ede9fe; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; color: #6d28d9; font-size: 16px; line-height: 1.6;">
          <strong>🙏 Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!</strong>
        </p>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `🎉 Đơn hàng đã hoàn thành!

Xin chào ${order.customer.name},

Đơn hàng #${orderNumber} của bạn đã được hoàn thành thành công!

Thời gian hoàn thành: ${order.completedAt ? new Date(order.completedAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}

📦 Chi tiết sản phẩm/dịch vụ:
${order.items.map(item => {
      let itemInfo = `• ${item.name} x${item.quantity}`;
      if (item.requiredFieldsData && item.requiredFieldsData.length > 0) {
        itemInfo += '\n' + item.requiredFieldsData.map(field => `  └ ${field.label}: ${field.value}`).join('\n');
      }
      return itemInfo;
    }).join('\n\n')}

💡 Hướng dẫn sử dụng:
• Vui lòng kiểm tra thông tin sản phẩm/dịch vụ ở trên
• Nếu có vấn đề, vui lòng liên hệ hỗ trợ qua Zalo: 0868899104
• Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7

Đánh giá sản phẩm: ${reviewUrl}
Xem chi tiết: ${orderUrl}

🙏 Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi!
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send order cancelled email to user
   * @param {Object} order - Order object
   * @param {string} reason - Cancellation reason (optional)
   */
  async sendOrderCancelledEmailToUser(order, reason) {
    const orderNumber = order.orderCode;
    const subject = `Đơn hàng #${orderNumber} đã bị hủy`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;
    const shopUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/products` : `http://localhost:5173/products`;

    const refundInfo = order.paymentStatus === 'paid'
      ? '<p style="margin: 10px 0 0 0; color: #065f46; font-size: 14px;">💰 Tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc.</p>'
      : '';

    const content = `
      <h2 style="color: #dc2626; margin-top: 0;">❌ Đơn hàng đã bị hủy</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Rất tiếc, đơn hàng <strong>#${orderNumber}</strong> của bạn đã bị hủy.
      </p>
      
      <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #991b1b; font-weight: 600;">Mã đơn hàng:</p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #dc2626;">#${orderNumber}</p>
        ${refundInfo}
      </div>

      ${reason ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 5px 0; font-weight: 600; color: #92400e;">📝 Lý do hủy:</p>
          <p style="margin: 0; color: #78350f; white-space: pre-line;">${reason}</p>
        </div>
      ` : ''}

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>💡 Bạn có thể:</strong><br>
          • Đặt lại đơn hàng mới tại cửa hàng của chúng tôi<br>
          • Liên hệ hỗ trợ nếu có thắc mắc: <a href="https://zalo.me/84868899104" style="color: #2563eb;">Zalo 0868899104</a>
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${shopUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          🛒 Đặt lại đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `❌ Đơn hàng đã bị hủy

Xin chào ${order.customer.name},

Rất tiếc, đơn hàng #${orderNumber} của bạn đã bị hủy.

${reason ? `Lý do hủy:\n${reason}\n\n` : ''}${order.paymentStatus === 'paid' ? '💰 Tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc.\n\n' : ''}💡 Bạn có thể:
• Đặt lại đơn hàng mới tại cửa hàng của chúng tôi
• Liên hệ hỗ trợ nếu có thắc mắc: Zalo 0868899104

Đặt lại đơn hàng: ${shopUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send payment failed email to user
   * @param {Object} order - Order object
   * @param {string} reason - Failure reason (optional)
   */
  async sendPaymentFailedEmailToUser(order, reason) {
    const orderNumber = order.orderCode;
    const subject = `Thanh toán thất bại - Đơn hàng #${orderNumber}`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;

    const content = `
      <h2 style="color: #dc2626; margin-top: 0;">❌ Thanh toán thất bại</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Thanh toán cho đơn hàng <strong>#${orderNumber}</strong> không thành công.
      </p>
      
      <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #991b1b; font-weight: 600;">Mã đơn hàng:</p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #dc2626;">#${orderNumber}</p>
        ${reason ? `<p style="margin: 10px 0 0 0; color: #991b1b; font-size: 14px;">Lý do: ${reason}</p>` : ''}
      </div>

      ${reason ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
            <strong>💡 Gợi ý:</strong><br>
            • Kiểm tra lại số dư tài khoản<br>
            • Đảm bảo thông tin thẻ/ngân hàng chính xác<br>
            • Thử lại thanh toán hoặc liên hệ ngân hàng của bạn
          </p>
        </div>
      ` : ''}

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>📋 Bước tiếp theo:</strong><br>
          • Bạn có thể thanh toán lại đơn hàng bằng link bên dưới<br>
          • Đơn hàng vẫn được giữ trong 24 giờ<br>
          • Nếu cần hỗ trợ, vui lòng liên hệ: <a href="https://zalo.me/84868899104" style="color: #2563eb;">Zalo 0868899104</a>
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${orderUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          💳 Thanh toán lại
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `❌ Thanh toán thất bại

Xin chào ${order.customer.name},

Thanh toán cho đơn hàng #${orderNumber} không thành công.

${reason ? `Lý do: ${reason}\n\n` : ''}${reason ? `💡 Gợi ý:
• Kiểm tra lại số dư tài khoản
• Đảm bảo thông tin thẻ/ngân hàng chính xác
• Thử lại thanh toán hoặc liên hệ ngân hàng của bạn

` : ''}📋 Bước tiếp theo:
• Bạn có thể thanh toán lại đơn hàng bằng link bên dưới
• Đơn hàng vẫn được giữ trong 24 giờ
• Nếu cần hỗ trợ, vui lòng liên hệ: Zalo 0868899104

Thanh toán lại: ${orderUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send payment expired email to user
   * @param {Object} order - Order object
   */
  async sendPaymentExpiredEmailToUser(order) {
    const orderNumber = order.orderCode;
    const subject = `Link thanh toán hết hạn - Đơn hàng #${orderNumber}`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;

    const content = `
      <h2 style="color: #d97706; margin-top: 0;">⏰ Link thanh toán đã hết hạn</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Link thanh toán cho đơn hàng <strong>#${orderNumber}</strong> đã hết hạn.
      </p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e; font-weight: 600;">Mã đơn hàng:</p>
        <p style="margin: 0; font-size: 18px; font-weight: 700; color: #d97706;">#${orderNumber}</p>
      </div>

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>📋 Bước tiếp theo:</strong><br>
          • Bạn có thể tạo link thanh toán mới bằng cách vào trang chi tiết đơn hàng<br>
          • Đơn hàng vẫn được giữ trong 24 giờ<br>
          • Vui lòng thanh toán sớm để đơn hàng được xử lý nhanh chóng
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${orderUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          🔗 Tạo link thanh toán mới
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `⏰ Link thanh toán đã hết hạn

Xin chào ${order.customer.name},

Link thanh toán cho đơn hàng #${orderNumber} đã hết hạn.

📋 Bước tiếp theo:
• Bạn có thể tạo link thanh toán mới bằng cách vào trang chi tiết đơn hàng
• Đơn hàng vẫn được giữ trong 24 giờ
• Vui lòng thanh toán sớm để đơn hàng được xử lý nhanh chóng

Tạo link thanh toán mới: ${orderUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send payment reminder email to user
   * @param {Object} order - Order object
   */
  async sendPaymentReminderEmailToUser(order) {
    const orderNumber = order.orderCode;
    const subject = `⏰ Nhắc nhở thanh toán - Đơn hàng #${orderNumber}`;

    const orderUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/orders/${order._id}` : `http://localhost:5173/orders/${order._id}`;
    const paymentUrl = order.checkoutUrl || orderUrl;

    const content = `
      <h2 style="color: #d97706; margin-top: 0;">⏰ Nhắc nhở thanh toán</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Xin chào <strong>${order.customer.name}</strong>,
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Bạn có đơn hàng <strong>#${orderNumber}</strong> đang chờ thanh toán.
      </p>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e; font-weight: 600;">Tổng tiền cần thanh toán:</p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: #d97706;">${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}</p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
          ⏰ Vui lòng thanh toán trong vòng 24 giờ để đơn hàng được xử lý
        </p>
      </div>

      <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
          <strong>💡 Lưu ý:</strong><br>
          • Đơn hàng sẽ tự động hủy sau 24 giờ nếu chưa thanh toán<br>
          • Thanh toán sớm để đơn hàng được xử lý nhanh chóng<br>
          • Nếu đã thanh toán, vui lòng bỏ qua email này
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${paymentUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          💳 Thanh toán ngay
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `⏰ Nhắc nhở thanh toán

Xin chào ${order.customer.name},

Bạn có đơn hàng #${orderNumber} đang chờ thanh toán.

Tổng tiền cần thanh toán: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}
⏰ Vui lòng thanh toán trong vòng 24 giờ để đơn hàng được xử lý

💡 Lưu ý:
• Đơn hàng sẽ tự động hủy sau 24 giờ nếu chưa thanh toán
• Thanh toán sớm để đơn hàng được xử lý nhanh chóng
• Nếu đã thanh toán, vui lòng bỏ qua email này

Thanh toán ngay: ${paymentUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: order.customer.email,
      subject,
      text,
      html
    });
  }

  /**
   * Send order pending reminder email to admin
   * @param {Object} order - Order object
   * @param {number} hoursPending - Number of hours order has been pending
   */
  async sendOrderPendingReminderEmailToAdmin(order, hoursPending) {
    const adminEmail = this.getAdminEmail();
    const orderNumber = order.orderCode;
    const subject = `[Nhắc nhở] Đơn hàng #${orderNumber} chờ xác nhận ${hoursPending} giờ`;

    const adminUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/admin/orders/${order._id}` : `http://localhost:5173/admin/orders/${order._id}`;

    const content = `
      <h2 style="color: #d97706; margin-top: 0;">⏰ Đơn hàng chờ xác nhận lâu</h2>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #92400e;">Mã đơn hàng: #${orderNumber}</p>
        <p style="margin: 0 0 10px 0; font-size: 16px; color: #d97706;">
          ⏰ Đã chờ xác nhận: <strong>${hoursPending} giờ</strong>
        </p>
        <p style="margin: 0; font-size: 14px; color: #78350f;">
          Tổng tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}
        </p>
      </div>

      <h3 style="color: #1f2937; margin-top: 25px;">👤 Thông tin khách hàng</h3>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Tên:</strong> ${order.customer.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${order.customer.email}</p>
        <p style="margin: 5px 0;"><strong>Số điện thoại:</strong> ${order.customer.phone}</p>
      </div>

      <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
          <strong>⚠️ Lưu ý:</strong> Đơn hàng đã thanh toán nhưng chưa được xác nhận. Vui lòng xử lý sớm để đảm bảo trải nghiệm khách hàng tốt nhất.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          🔗 Xem và xử lý đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `⏰ Đơn hàng chờ xác nhận lâu

Mã đơn hàng: #${orderNumber}
⏰ Đã chờ xác nhận: ${hoursPending} giờ
Tổng tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}

👤 Thông tin khách hàng:
Tên: ${order.customer.name}
Email: ${order.customer.email}
Số điện thoại: ${order.customer.phone}

⚠️ Lưu ý: Đơn hàng đã thanh toán nhưng chưa được xác nhận. Vui lòng xử lý sớm.

🔗 Xem và xử lý: ${adminUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: adminEmail,
      subject,
      text,
      html
    });
  }

  /**
   * Send order special note email to admin
   * @param {Object} order - Order object
   */
  async sendOrderSpecialNoteEmailToAdmin(order) {
    const adminEmail = this.getAdminEmail();
    const orderNumber = order.orderCode;
    const subject = `[Yêu cầu đặc biệt] Đơn hàng #${orderNumber}`;

    const adminUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/admin/orders/${order._id}` : `http://localhost:5173/admin/orders/${order._id}`;

    const requiredFieldsHtml = order.items.some(item => item.requiredFieldsData && item.requiredFieldsData.length > 0)
      ? order.items.map((item, itemIndex) => {
        if (!item.requiredFieldsData || item.requiredFieldsData.length === 0) return '';
        return `
            <div style="margin-top: 10px; padding: 10px; background-color: #fef3c7; border-radius: 6px; border-left: 3px solid #f59e0b;">
              <strong>${item.name}:</strong>
              ${item.requiredFieldsData.map(field => `
                <p style="margin: 5px 0; font-size: 14px;">• <strong>${field.label}:</strong> ${field.value}</p>
              `).join('')}
            </div>
          `;
      }).filter(html => html).join('')
      : '';

    const content = `
      <h2 style="color: #f59e0b; margin-top: 0;">⚠️ Đơn hàng có yêu cầu đặc biệt</h2>
      
      <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
        <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #92400e;">Mã đơn hàng: #${orderNumber}</p>
        <p style="margin: 0; font-size: 14px; color: #78350f;">
          Tổng tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}
        </p>
      </div>

      <h3 style="color: #1f2937; margin-top: 25px;">👤 Thông tin khách hàng</h3>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 5px 0;"><strong>Tên:</strong> ${order.customer.name}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${order.customer.email}</p>
        <p style="margin: 5px 0;"><strong>Số điện thoại:</strong> ${order.customer.phone}</p>
      </div>

      ${order.note ? `
        <h3 style="color: #1f2937; margin-top: 25px;">📝 Ghi chú khách hàng</h3>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #78350f; white-space: pre-line;">${order.note}</p>
        </div>
      ` : ''}

      ${requiredFieldsHtml ? `
        <h3 style="color: #1f2937; margin-top: 25px;">⚠️ Thông tin bổ sung từ khách hàng</h3>
        ${requiredFieldsHtml}
      ` : ''}

      <div style="background-color: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
        <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
          <strong>⚠️ Lưu ý:</strong> Đơn hàng này có yêu cầu đặc biệt. Vui lòng xem xét và xử lý cẩn thận.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          🔗 Xem và xử lý đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `⚠️ Đơn hàng có yêu cầu đặc biệt

Mã đơn hàng: #${orderNumber}
Tổng tiền: ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}

👤 Thông tin khách hàng:
Tên: ${order.customer.name}
Email: ${order.customer.email}
Số điện thoại: ${order.customer.phone}

${order.note ? `📝 Ghi chú khách hàng:\n${order.note}\n\n` : ''}${order.items.some(item => item.requiredFieldsData && item.requiredFieldsData.length > 0) ? '⚠️ Thông tin bổ sung:\n' + order.items.map(item => {
      if (!item.requiredFieldsData || item.requiredFieldsData.length === 0) return '';
      return `${item.name}:\n` + item.requiredFieldsData.map(field => `  • ${field.label}: ${field.value}`).join('\n');
    }).filter(text => text).join('\n\n') + '\n\n' : ''}⚠️ Lưu ý: Đơn hàng này có yêu cầu đặc biệt. Vui lòng xem xét và xử lý cẩn thận.

🔗 Xem và xử lý: ${adminUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: adminEmail,
      subject,
      text,
      html
    });
  }

  /**
   * Send daily order summary email to admin
   * @param {Object} stats - Statistics object
   * @param {Array} orders - Orders needing attention
   */
  async sendDailyOrderSummaryEmailToAdmin(stats, orders) {
    const adminEmail = this.getAdminEmail();
    const subject = `[Tổng kết] Đơn hàng hôm nay - ${new Date().toLocaleDateString('vi-VN')}`;

    const adminUrl = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/admin/orders` : `http://localhost:5173/admin/orders`;

    const ordersHtml = orders && orders.length > 0 ? orders.map(order => {
      const orderNumber = order._id.toString().slice(-8).toUpperCase();
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/orders/${order._id}" style="color: #2563eb; text-decoration: none;">#${orderNumber}</a>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">${order.customer.name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e5e5; text-align: right;">${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e5e5;">${order.orderStatus === 'pending' ? 'Chờ xử lý' : order.orderStatus}</td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="4" style="padding: 15px; text-align: center; color: #6b7280;">Không có đơn hàng cần chú ý</td></tr>';

    const content = `
      <h2 style="color: #1f2937; margin-top: 0;">📊 Tổng kết đơn hàng hôm nay</h2>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Ngày: <strong>${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
      </p>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
        <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #1e40af; font-weight: 600;">Đơn hàng mới</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #2563eb;">${stats.todayOrders || 0}</p>
        </div>
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #92400e; font-weight: 600;">Chờ xác nhận</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #d97706;">${stats.pendingConfirmation || 0}</p>
        </div>
        <div style="background-color: #ede9fe; padding: 20px; border-radius: 8px; border-left: 4px solid #7c3aed;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #5b21b6; font-weight: 600;">Đang xử lý</p>
          <p style="margin: 0; font-size: 28px; font-weight: 700; color: #7c3aed;">${stats.processing || 0}</p>
        </div>
        <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; border-left: 4px solid #059669;">
          <p style="margin: 0 0 5px 0; font-size: 14px; color: #065f46; font-weight: 600;">Doanh thu hôm nay</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #059669;">${this.formatPrice(stats.todayRevenue || 0, 'VND')}</p>
        </div>
      </div>

      ${orders && orders.length > 0 ? `
        <h3 style="color: #1f2937; margin-top: 30px;">⚠️ Đơn hàng cần chú ý</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 15px 0;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Mã đơn</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Khách hàng</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Tổng tiền</th>
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e5e5; font-weight: 600; color: #374151;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${ordersHtml}
          </tbody>
        </table>
      ` : ''}

      <div style="text-align: center; margin: 30px 0;">
        <a href="${adminUrl}" style="display: inline-block; padding: 15px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
          🔗 Xem tất cả đơn hàng
        </a>
      </div>
    `;

    const html = this.createHtmlEmailWrapper(content, subject);
    const text = `📊 Tổng kết đơn hàng hôm nay

Ngày: ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Thống kê:
• Đơn hàng mới: ${stats.todayOrders || 0}
• Chờ xác nhận: ${stats.pendingConfirmation || 0}
• Đang xử lý: ${stats.processing || 0}
• Doanh thu hôm nay: ${this.formatPrice(stats.todayRevenue || 0, 'VND')}

${orders && orders.length > 0 ? `\n⚠️ Đơn hàng cần chú ý:\n${orders.map(order => {
      const orderNumber = order._id.toString().slice(-8).toUpperCase();
      return `• #${orderNumber} - ${order.customer.name} - ${this.formatPrice(order.totalAmount, order.items[0]?.currency || 'VND')} - ${order.orderStatus}`;
    }).join('\n')}\n` : ''}🔗 Xem tất cả đơn hàng: ${adminUrl}
${this.createEmailFooter()}`;

    return await sendEmail({
      to: adminEmail,
      subject,
      text,
      html
    });
  }
}

module.exports = new EmailService();

