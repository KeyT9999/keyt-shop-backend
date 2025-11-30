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

// Index for case-insensitive email search
chatGptAccountSchema.index({ chatgptEmail: 1 }, { unique: true });

const ChatGptAccount = mongoose.model('ChatGptAccount', chatGptAccountSchema);

module.exports = ChatGptAccount;

