require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../src/models/user.model');

const USERS = [
  {
    username: 'admin-keyt',
    email: 'admin@keytshop.test',
    password: 'Admin1234',
    loginType: 'login-common',
    admin: true
  },
  {
    username: 'user-keyt',
    email: 'user@keytshop.test',
    password: 'User1234',
    loginType: 'login-common',
    admin: false
  }
];

async function createIfMissing(candidate) {
  const exists = await User.findOne({ email: candidate.email });
  if (exists) {
    console.log(`✔️ User already exists: ${candidate.email}`);
    return;
  }

  const passwordHash =
    candidate.password === null || candidate.password === undefined
      ? null
      : await bcrypt.hash(candidate.password, 10);

  await User.create({
    username: candidate.username,
    email: candidate.email,
    password: passwordHash,
    loginType: candidate.loginType,
    admin: candidate.admin
  });
  console.log(`✅ Created user ${candidate.username} (${candidate.email})`);
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/keyt_db';
  await mongoose.connect(mongoUri);

  for (const user of USERS) {
    await createIfMissing(user);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

