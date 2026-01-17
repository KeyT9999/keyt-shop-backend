const mongoose = require('mongoose');

const chatGptAccountSchema = new mongoose.Schema(
  {
    chatgptEmail: {
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

// Note: unique index is already created by { unique: true } in schema definition above
// No need to create duplicate index

const ChatGptAccount = mongoose.model('ChatGptAccount', chatGptAccountSchema);

module.exports = ChatGptAccount;

