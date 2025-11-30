const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USERNAME || 'tiemtaphoakeyt@gmail.com',
    pass: process.env.MAIL_PASSWORD // REQUIRED: Must be set in .env file
  }
});

const fromEmail = process.env.MAIL_FROM || 'Tiệm Tạp Hóa KeyT <tiemtaphoakeyt@gmail.com>';
const replyToEmail = process.env.MAIL_REPLY_TO || 'tiemtaphoakeyt@gmail.com';

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
    return { success: false, error: error.message };
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

