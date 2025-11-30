const ChatGptAccount = require('../models/chatgpt-account.model');
const User = require('../models/user.model');

class ChatGptAccountService {
  /**
   * Save or update ChatGPT account
   * @param {Object} accountData - Account data
   * @returns {Promise<Object>} - Saved account
   */
  async saveChatGptAccount(accountData) {
    if (accountData.chatgptEmail) {
      accountData.chatgptEmail = accountData.chatgptEmail.trim().toLowerCase();
    }
    if (accountData.secretKey) {
      accountData.secretKey = accountData.secretKey.trim();
    }
    return await ChatGptAccount.create(accountData);
  }

  /**
   * Find account by email (case-insensitive)
   * @param {string} chatgptEmail - Email to search
   * @returns {Promise<Object|null>} - Found account or null
   */
  async findByEmail(chatgptEmail) {
    if (!chatgptEmail) return null;
    const normalized = chatgptEmail.trim().toLowerCase();
    return await ChatGptAccount.findOne({ chatgptEmail: normalized });
  }

  /**
   * Check if account exists by email
   * @param {string} chatgptEmail - Email to check
   * @returns {Promise<boolean>} - True if exists
   */
  async existsByEmail(chatgptEmail) {
    if (!chatgptEmail) return false;
    const normalized = chatgptEmail.trim().toLowerCase();
    return await ChatGptAccount.exists({ chatgptEmail: normalized });
  }

  /**
   * Get all ChatGPT accounts
   * @returns {Promise<Array>} - All accounts
   */
  async getAllChatGptAccounts() {
    return await ChatGptAccount.find({}).sort({ createdAt: -1 });
  }

  /**
   * Get account by ID
   * @param {string} id - Account ID
   * @returns {Promise<Object|null>} - Found account or null
   */
  async getChatGptAccountById(id) {
    return await ChatGptAccount.findById(id);
  }

  /**
   * Update ChatGPT account
   * @param {string} id - Account ID
   * @param {Object} updateData - Update data
   * @returns {Promise<Object|null>} - Updated account or null
   */
  async updateChatGptAccount(id, updateData) {
    const account = await ChatGptAccount.findById(id);
    if (!account) return null;

    if (updateData.chatgptEmail) {
      const normalized = updateData.chatgptEmail.trim().toLowerCase();
      // Check if email already exists for another account
      const existing = await ChatGptAccount.findOne({
        chatgptEmail: normalized,
        _id: { $ne: id }
      });
      if (existing) {
        throw new Error('Email ChatGPT đã tồn tại.');
      }
      account.chatgptEmail = normalized;
    }

    if (updateData.secretKey) {
      account.secretKey = updateData.secretKey.trim();
    }

    return await account.save();
  }

  /**
   * Delete ChatGPT account
   * @param {string} id - Account ID
   * @returns {Promise<boolean>} - True if deleted
   */
  async deleteChatGptAccount(id) {
    const result = await ChatGptAccount.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Get all users (for admin)
   * @returns {Promise<Array>} - All users
   */
  async getAllUsers() {
    return await User.find({}).sort({ createdAt: -1 });
  }

  /**
   * Get user by ID
   * @param {string} id - User ID
   * @returns {Promise<Object|null>} - Found user or null
   */
  async getUserById(id) {
    return await User.findById(id);
  }
}

module.exports = new ChatGptAccountService();

