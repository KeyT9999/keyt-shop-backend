const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 6,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      minlength: 6,
      required: function () {
        return this.loginType === 'login-common';
      }
    },
    loginType: {
      type: String,
      enum: ['login-common', 'login-google'],
      default: 'login-common'
    },
    googleId: {
      type: String,
      trim: true
    },
    admin: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      trim: true
    },
    displayName: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      trim: true
    },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true }
      },
      theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
      language: { type: String, default: 'vi' }
    },
    emailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    geminiApiKey: {
      type: String,
      trim: true,
      select: false // Don't return by default for security
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;

