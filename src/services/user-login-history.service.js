const UserLoginHistory = require('../models/user-login-history.model');

class UserLoginHistoryService {
  /**
   * Record user login
   * @param {string} userId - User ID
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent (optional)
   * @returns {Promise<Object>} - Created login history
   */
  async recordLogin(userId, ipAddress, userAgent = null) {
    if (!userId || !ipAddress || !ipAddress.trim()) {
      return null;
    }

    return await UserLoginHistory.create({
      userId,
      ipAddress: ipAddress.trim(),
      userAgent: userAgent ? userAgent.trim() : null,
      loginTime: new Date()
    });
  }

  /**
   * Get login history for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Login history (sorted by most recent)
   */
  async getLoginHistoryByUser(userId) {
    return await UserLoginHistory.find({ userId })
      .sort({ loginTime: -1 })
      .populate('userId', 'username email')
      .lean();
  }

  /**
   * Get login history for a user (ascending order)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Login history (sorted by oldest first)
   */
  async getLoginHistoryByUserAsc(userId) {
    return await UserLoginHistory.find({ userId })
      .sort({ loginTime: 1 })
      .populate('userId', 'username email')
      .lean();
  }

  /**
   * Get first 2 distinct IPs for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<string>>} - Array of IP addresses
   */
  async getFirst2DistinctIps(userId) {
    const history = await this.getLoginHistoryByUserAsc(userId);
    const seen = new Set();
    const first2Ips = [];

    for (const entry of history) {
      if (entry.ipAddress && !seen.has(entry.ipAddress)) {
        seen.add(entry.ipAddress);
        first2Ips.push(entry.ipAddress);
        if (first2Ips.length === 2) break;
      }
    }

    return first2Ips;
  }

  /**
   * Count distinct IPs for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Distinct IP count
   */
  async countDistinctIpByUser(userId) {
    const distinctIps = await UserLoginHistory.distinct('ipAddress', { userId });
    return distinctIps.filter(ip => ip).length;
  }
}

module.exports = new UserLoginHistoryService();

