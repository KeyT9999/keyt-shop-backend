const OtpRequest = require('../models/otp-request.model');

class OtpRequestService {
  /**
   * Record OTP request
   * @param {string} userId - User ID
   * @param {string} chatgptEmail - ChatGPT email
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<Object>} - Created OTP request
   */
  async recordOtpRequest(userId, chatgptEmail, ipAddress, userAgent) {
    return await OtpRequest.create({
      userId,
      chatgptEmail: chatgptEmail ? chatgptEmail.trim().toLowerCase() : null,
      ipAddress: ipAddress ? ipAddress.trim() : null,
      userAgent: userAgent ? userAgent.trim() : null,
      requestedAt: new Date()
    });
  }

  /**
   * Get OTP request count for user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Request count
   */
  async getOtpRequestCount(userId) {
    return await OtpRequest.countDocuments({ userId });
  }

  /**
   * Get OTP requests by user (sorted by most recent)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - OTP requests
   */
  async getOtpRequestsByUser(userId) {
    return await OtpRequest.find({ userId })
      .sort({ requestedAt: -1 })
      .populate('userId', 'username email');
  }

  /**
   * Get first 2 distinct IPs for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array<string>>} - Array of IP addresses
   */
  async findFirst2DistinctIpByUser(userId) {
    const requests = await OtpRequest.find({ userId, ipAddress: { $ne: null } })
      .sort({ requestedAt: 1 })
      .select('ipAddress')
      .lean();

    const seen = new Set();
    const first2Ips = [];

    for (const req of requests) {
      if (req.ipAddress && !seen.has(req.ipAddress)) {
        seen.add(req.ipAddress);
        first2Ips.push(req.ipAddress);
        if (first2Ips.length === 2) break;
      }
    }

    return first2Ips;
  }

  /**
   * Record OTP request with IP limit (max 2 IPs)
   * @param {string} userId - User ID
   * @param {string} chatgptEmail - ChatGPT email
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<boolean>} - True if allowed and recorded, false if IP limit exceeded
   */
  async recordOtpRequestWithIpLimit(userId, chatgptEmail, ipAddress, userAgent) {
    if (!ipAddress || !ipAddress.trim()) {
      return false;
    }

    const first2Ips = await this.findFirst2DistinctIpByUser(userId);
    
    // Allow if less than 2 IPs or current IP is in the first 2
    if (first2Ips.length < 2 || first2Ips.includes(ipAddress.trim())) {
      await this.recordOtpRequest(userId, chatgptEmail, ipAddress, userAgent);
      return true;
    }

    // Already has 2 different IPs, deny
    return false;
  }

  /**
   * Get all users OTP info (for admin)
   * @returns {Promise<Array>} - Array of user OTP info
   */
  async getAllUsersOtpInfo() {
    const results = await OtpRequest.aggregate([
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          lastRequest: { $max: '$requestedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          userId: '$_id',
          user: 1,
          count: 1,
          lastRequest: 1
        }
      }
    ]);

    return results.map(result => ({
      user: result.user,
      count: result.count || 0,
      lastRequest: result.lastRequest
    }));
  }

  /**
   * Get OTP request count for specific user
   * @param {string} userId - User ID
   * @returns {Promise<number>} - Request count
   */
  async getOtpRequestCountForUser(userId) {
    return await this.getOtpRequestCount(userId);
  }
}

module.exports = new OtpRequestService();

