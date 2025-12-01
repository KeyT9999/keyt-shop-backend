const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('../src/models/order.model');

async function migrateOrders() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/keyt-shop');
    console.log('✅ Connected to database');

    // Find all orders that need migration
    const orders = await Order.find({
      $or: [
        { orderStatus: { $exists: false } },
        { paymentStatus: { $exists: false } }
      ]
    });

    console.log(`📦 Found ${orders.length} orders to migrate`);

    let migrated = 0;
    for (const order of orders) {
      let updated = false;

      // Migrate orderStatus
      if (!order.orderStatus) {
        if (order.status === 'pending') {
          order.orderStatus = 'pending';
          updated = true;
        } else if (order.status === 'paid') {
          order.orderStatus = 'pending'; // Giữ pending vì chưa được admin xác nhận
          updated = true;
        } else if (order.status === 'cancelled') {
          order.orderStatus = 'cancelled';
          updated = true;
        } else {
          // Default to pending if status is missing
          order.orderStatus = 'pending';
          updated = true;
        }
      }

      // Migrate paymentStatus
      if (!order.paymentStatus) {
        if (order.status === 'paid') {
          order.paymentStatus = 'paid';
          updated = true;
        } else if (order.status === 'cancelled') {
          order.paymentStatus = 'pending';
          updated = true;
        } else {
          // Default to pending
          order.paymentStatus = 'pending';
          updated = true;
        }
      }

      if (updated) {
        await order.save();
        migrated++;
        console.log(`✅ Migrated order ${order._id}: orderStatus=${order.orderStatus}, paymentStatus=${order.paymentStatus}`);
      }
    }

    console.log(`\n✅ Migration complete! Migrated ${migrated} orders`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateOrders();

