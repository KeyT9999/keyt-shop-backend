const crypto = require('crypto');

/**
 * Base32 decode function
 * @param {string} str - Base32 encoded string
 * @returns {Buffer} - Decoded buffer
 */
function base32Decode(str) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i].toUpperCase();
    const charIndex = base32chars.indexOf(char);
    
    if (charIndex === -1) continue; // Skip invalid characters
    
    value = (value << 5) | charIndex;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 0xff;
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Generate TOTP code from secret key
 * @param {string} secretKey - Base32 encoded secret key
 * @returns {string} - 6-digit TOTP code
 */
function getTOTPCode(secretKey) {
  if (!secretKey) {
    throw new Error('Secret key is required');
  }

  // Calculate time step (30-second window)
  const time = Math.floor(Date.now() / 1000 / 30);
  
  // Decode base32 secret
  const key = base32Decode(secretKey);
  
  // Create time buffer (8 bytes, big-endian) - MUST initialize with zeros!
  const timeBuffer = Buffer.alloc(8); // Use alloc() instead of allocUnsafe() to initialize with zeros
  timeBuffer.writeUInt32BE(0, 0); // Write 0 to high-order bytes
  timeBuffer.writeUInt32BE(time, 4); // Write time counter to low-order bytes
  
  // Calculate HMAC-SHA1
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(timeBuffer);
  const hash = hmac.digest();
  
  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const code = ((hash[offset] & 0x7f) << 24 |
                (hash[offset + 1] & 0xff) << 16 |
                (hash[offset + 2] & 0xff) << 8 |
                (hash[offset + 3] & 0xff)) % 1000000;
  
  // Return 6-digit code with leading zeros
  return code.toString().padStart(6, '0');
}

module.exports = { getTOTPCode, base32Decode };

