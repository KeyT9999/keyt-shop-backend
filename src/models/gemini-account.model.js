const mongoose = require('mongoose');

const geminiAccountSchema = new mongoose.Schema(
  {
    geminiEmail: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    secretKey: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const GeminiAccount = mongoose.model('GeminiAccount', geminiAccountSchema);

module.exports = GeminiAccount;
