require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const connectDB = require('../src/config/db');

async function createAdmin() {
  try {
    // Connect to database
    await connectDB();

    // Admin credentials
    const adminData = {
      username: 'admin-keyt',
      email: 'trankimthang0207@gmail.com',
      password: 'Admin123456',
      admin: true,
      emailVerified: true, // Set to true so admin can login immediately
      loginType: 'login-common'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [
        { username: adminData.username },
        { email: adminData.email }
      ]
    });

    if (existingAdmin) {
      if (existingAdmin.admin) {
        console.log('✅ Admin user already exists!');
        console.log('Username:', existingAdmin.username);
        console.log('Email:', existingAdmin.email);
        console.log('Admin:', existingAdmin.admin);
        
        // Update to ensure admin is true
        if (!existingAdmin.admin) {
          existingAdmin.admin = true;
          await existingAdmin.save();
          console.log('✅ Updated user to admin!');
        }
      } else {
        // User exists but not admin, update to admin
        existingAdmin.admin = true;
        existingAdmin.emailVerified = true;
        await existingAdmin.save();
        console.log('✅ Updated existing user to admin!');
        console.log('Username:', existingAdmin.username);
        console.log('Email:', existingAdmin.email);
        console.log('Password: (unchanged)');
      }
    } else {
      // Create new admin user
      const admin = new User(adminData);
      await admin.save();
      console.log('✅ Admin user created successfully!');
      console.log('Username:', admin.username);
      console.log('Email:', admin.email);
      console.log('Password:', adminData.password);
      console.log('Admin:', admin.admin);
    }

    console.log('\n📋 Login credentials:');
    console.log('Username: admin-keyt');
    console.log('Email: trankimthang0207@gmail.com');
    console.log('Password: Admin123456');
    console.log('\n⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();

