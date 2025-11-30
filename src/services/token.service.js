const crypto = require('crypto');

class TokenService {
  /**
   * Generate secure random token
   * @param {number} bytes
   * @returns {string}
   */
  generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }
}

module.exports = new TokenService();

