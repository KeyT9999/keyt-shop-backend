const nodemailer = require('nodemailer');

// Create transporter
// Support both MAIL_* and SMTP_* environment variables for flexibility
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || process.env.SMTP_PORT || '587'),
  secure: process.env.MAIL_SECURE === 'true' || process.env.SMTP_SECURE === 'true' || false,
  auth: {
    user: process.env.MAIL_USERNAME || process.env.SMTP_USER || 'tiemtaphoakeyt@gmail.com',
    pass: process.env.MAIL_PASSWORD || process.env.SMTP_PASS // REQUIRED: Must be set in .env file
  }
});

const fromEmail = process.env.MAIL_FROM || 'Tiệm Tạp Hóa KeyT <tiemtaphoakeyt@gmail.com>';
const replyToEmail = process.env.MAIL_REPLY_TO || process.env.SMTP_USER || 'tiemtaphoakeyt@gmail.com';

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content (optional)
 * @returns {Promise<Object>} - Result with success flag and messageId or error
 */
async function sendEmail({ to, subject, text, html }) {
  // Check if email password is configured
  const emailPassword = process.env.MAIL_PASSWORD || process.env.SMTP_PASS;
  if (!emailPassword) {
    const errorMsg = 'Email password (MAIL_PASSWORD or SMTP_PASS) is not configured in environment variables';
    console.error('❌ Email configuration error:', errorMsg);
    throw new Error(errorMsg);
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      replyTo: replyToEmail,
      to,
      subject,
      text,
      html
    });
    console.log('✅ Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    // Throw error instead of returning { success: false } so that try-catch blocks can catch it
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Test email configuration
 * @returns {Promise<boolean>} - True if test successful
 */
async function testEmailConfiguration() {
  try {
    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return false;
  }
}

module.exports = { sendEmail, testEmailConfiguration, transporter };

