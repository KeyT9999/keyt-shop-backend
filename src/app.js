require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const orderRoutes = require('./routes/order.routes');
const chatgptRoutes = require('./routes/chatgpt.routes');
const evidenceRoutes = require('./routes/evidence.routes');
const priceChangeRoutes = require('./routes/priceChange.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const uploadRoutes = require('./routes/upload.routes');
const categoryRoutes = require('./routes/category.routes');
const payosRoutes = require('./routes/payos.routes');
const bannerRoutes = require('./routes/banner.routes');
const reviewRoutes = require('./routes/review.routes');
const { authenticateToken, requireAdmin } = require('./middleware/auth.middleware');

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://www.taphoakeyt.com',
      'https://taphoakeyt.vercel.app', // Keep for backward compatibility
      'https://www.taphoakeyt.com',
      'https://taphoakeyt.com',
      'https://*.vercel.app', // Allow all Vercel preview deployments
    ];

    // Check if origin is allowed
    const originDomain = origin.replace(/^https?:\/\//, '');
    
    // Check exact match or Vercel preview deployments
    const isAllowed = allowedOrigins.some(allowed => {
      const allowedDomain = allowed.replace(/^https?:\/\//, '');
      // Exact match
      if (originDomain === allowedDomain) return true;
      // Vercel preview deployments (*.vercel.app)
      if (allowedDomain === '*.vercel.app' && originDomain.endsWith('.vercel.app')) return true;
      // Partial match (for flexible matching)
      if (originDomain.includes(allowedDomain) || allowedDomain.includes(originDomain)) return true;
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      // In production, reject unknown origins
      if (process.env.NODE_ENV === 'production') {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      } else {
        // In development, allow all
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('KeyT Shop Backend is running 🚀');
});

// Test email endpoint - SECURITY: Only accessible to admins, disabled in production
app.get('/api/test-email', authenticateToken, requireAdmin, async (req, res) => {
  // Disable in production for additional security
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_TEST_EMAIL !== 'true') {
    return res.status(404).json({ 
      success: false,
      message: 'Endpoint not found' 
    });
  }
  try {
    const { sendEmail, testEmailConfiguration } = require('./utils/email.util');
    const emailService = require('./services/email.service');

    // Test email configuration first
    const configValid = await testEmailConfiguration();
    if (!configValid) {
      return res.status(500).json({
        success: false,
        message: 'Email configuration is invalid. Please check your SMTP settings.'
      });
    }

    // Send test email to admin
    const adminEmail = emailService.getAdminEmail();
    const testEmail = {
      to: adminEmail,
      subject: '🧪 Test Email - Tiệm Tạp Hóa KeyT',
      text: `Đây là email test từ hệ thống Tiệm Tạp Hóa KeyT.

Thời gian gửi: ${new Date().toLocaleString('vi-VN')}

Nếu bạn nhận được email này, nghĩa là cấu hình email đã hoạt động đúng! ✅

Trân trọng,
Hệ thống Tiệm Tạp Hóa KeyT`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">🧪 Test Email - Tiệm Tạp Hóa KeyT</h2>
          <p>Đây là email test từ hệ thống Tiệm Tạp Hóa KeyT.</p>
          <p><strong>Thời gian gửi:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          <div style="background: #d1fae5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #059669;">
            <p style="margin: 0; color: #065f46; font-weight: 600;">
              ✅ Nếu bạn nhận được email này, nghĩa là cấu hình email đã hoạt động đúng!
            </p>
          </div>
          <p>Trân trọng,<br><strong>Hệ thống Tiệm Tạp Hóa KeyT</strong></p>
        </div>
      `
    };

    const result = await sendEmail(testEmail);

    if (result.success) {
      res.json({
        success: true,
        message: `Test email đã được gửi thành công đến ${adminEmail}`,
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Không thể gửi email test',
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error in test email endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi email test',
      error: error.message
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/chatgpt', chatgptRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/price-changes', priceChangeRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payos', payosRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/reviews', authenticateToken, reviewRoutes);

module.exports = app;

