const GeminiAccount = require('../models/gemini-account.model');

class GeminiAccountService {
  async saveGeminiAccount(accountData) {
    if (accountData.geminiEmail) {
      accountData.geminiEmail = accountData.geminiEmail.trim().toLowerCase();
    }
    if (accountData.secretKey) {
      accountData.secretKey = accountData.secretKey.trim();
    }
    return await GeminiAccount.create(accountData);
  }

  async findByEmail(geminiEmail) {
    if (!geminiEmail) return null;
    const normalized = geminiEmail.trim().toLowerCase();
    return await GeminiAccount.findOne({ geminiEmail: normalized });
  }

  async existsByEmail(geminiEmail) {
    if (!geminiEmail) return false;
    const normalized = geminiEmail.trim().toLowerCase();
    return await GeminiAccount.exists({ geminiEmail: normalized });
  }

  async getAllGeminiAccounts() {
    return await GeminiAccount.find({}).sort({ createdAt: -1 });
  }

  async getGeminiAccountById(id) {
    return await GeminiAccount.findById(id);
  }

  async updateGeminiAccount(id, updateData) {
    const account = await GeminiAccount.findById(id);
    if (!account) return null;

    if (updateData.geminiEmail) {
      const normalized = updateData.geminiEmail.trim().toLowerCase();
      const existing = await GeminiAccount.findOne({
        geminiEmail: normalized,
        _id: { $ne: id }
      });
      if (existing) {
        throw new Error('Email Gemini đã tồn tại.');
      }
      account.geminiEmail = normalized;
    }

    if (updateData.secretKey) {
      account.secretKey = updateData.secretKey.trim();
    }

    return await account.save();
  }

  async deleteGeminiAccount(id) {
    const result = await GeminiAccount.findByIdAndDelete(id);
    return !!result;
  }
}

module.exports = new GeminiAccountService();
