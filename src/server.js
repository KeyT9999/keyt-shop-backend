// src/server.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const Product = require('./models/product.model');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Kết nối DB
connectDB();

// Route test
app.get('/', (req, res) => {
  res.send('KeyT Shop Backend is running 🚀');
});

// API: Lấy danh sách products (trong đó có Canva Pro)
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// API: Lấy 1 product (ví dụ sau này dùng cho trang chi tiết)
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (err) {
    console.error('❌ Error fetching product:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
