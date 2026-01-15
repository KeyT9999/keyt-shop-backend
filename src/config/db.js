// src/config/db.js
const mongoose = require('mongoose');

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/TechShopDB';
  
  // Log connection attempt (without exposing password)
  const uriForLog = MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):([^@]+)@/, 'mongodb+srv://$1:***@');
  console.log('🔄 Attempting to connect to MongoDB...');
  console.log('📍 URI:', uriForLog);
  console.log('🔍 MONGODB_URI exists:', !!process.env.MONGODB_URI);
  console.log('🔍 MONGODB_URL exists:', !!process.env.MONGODB_URL);
  
  if (!process.env.MONGODB_URI && !process.env.MONGODB_URL) {
    console.warn('⚠️ Warning: Neither MONGODB_URI nor MONGODB_URL is set. Using default local MongoDB.');
  }
  
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
    });
    console.log('✅ MongoDB connected successfully');
    console.log('📊 Database:', mongoose.connection.db?.databaseName || 'unknown');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('❌ Error details:', {
      name: err.name,
      code: err.code,
      codeName: err.codeName,
      stack: err.stack
    });
    
    // More helpful error messages
    if (err.message.includes('authentication failed')) {
      console.error('💡 Tip: Check your MongoDB username and password');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
      console.error('💡 Tip: Check your MongoDB cluster URL/hostname');
    } else if (err.message.includes('timeout')) {
      console.error('💡 Tip: Check your MongoDB Atlas network access (whitelist IP)');
    }
    
    process.exit(1);
  }
}

module.exports = connectDB;

