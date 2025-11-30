require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const orderRoutes = require('./routes/order.routes');
const chatgptRoutes = require('./routes/chatgpt.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const uploadRoutes = require('./routes/upload.routes');
const categoryRoutes = require('./routes/category.routes');
const { authenticateToken } = require('./middleware/auth.middleware');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('KeyT Shop Backend is running 🚀');
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/chatgpt', chatgptRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);

module.exports = app;

