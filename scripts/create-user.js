const mongoose = require('mongoose');
const User = require('../src/models/user.model');
const connectDB = require('../src/config/db');

async function createUser() {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Get user info from command line arguments or use defaults
    const args = process.argv.slice(2);
    const username = args[0] || 'testuser';
    const email = args[1] || 'test@example.com';
    const password = args[2] || '123456';
    const isAdmin = args[3] === 'true' || args[3] === 'admin' || false;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });

    if (existingUser) {
      console.log('❌ User already exists:');
      console.log(`   Username: ${existingUser.username}`);
      console.log(`   Email: ${existingUser.email}`);
      process.exit(1);
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      admin: isAdmin,
      emailVerified: true, // Auto-verify for script-created users
      loginType: 'login-common'
    });

    console.log('✅ User created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${password}`);
    console.log(`Admin: ${user.admin ? 'Yes' : 'No'}`);
    console.log(`Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
    console.log(`User ID: ${user._id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Close connection
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate key error - username or email already exists');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
createUser();
