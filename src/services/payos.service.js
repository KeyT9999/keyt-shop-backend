const axios = require('axios');
const crypto = require('crypto');

const PAYOS_API_BASE_URL = 'https://api-merchant.payos.vn';
const CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const API_KEY = process.env.PAYOS_API_KEY;
const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;

/**
 * Create HMAC SHA256 signature for PayOS
 * @param {Object} data - Data to sign
 * @returns {string} - Signature
 */
function createSignature(data) {
  if (!CHECKSUM_KEY) {
    throw new Error('PAYOS_CHECKSUM_KEY is not configured');
  }

  // Sort keys alphabetically and create query string
  const sortedKeys = Object.keys(data).sort();
  const queryString = sortedKeys
    .map((key) => `${key}=${data[key]}`)
    .join('&');

  // Create HMAC SHA256 signature
  const signature = crypto
    .createHmac('sha256', CHECKSUM_KEY)
    .update(queryString)
    .digest('hex');

  return signature;
}

/**
 * Verify signature from PayOS webhook
 * @param {Object} data - Data to verify
 * @param {string} receivedSignature - Signature received from PayOS
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(data, receivedSignature) {
  if (!CHECKSUM_KEY) {
    return false;
  }

  const calculatedSignature = createSignature(data);
  return calculatedSignature === receivedSignature;
}

/**
 * Create payment link
 * @param {Object} orderData - Order data
 * @param {number} orderData.orderCode - Order code (integer, unique)
 * @param {number} orderData.amount - Amount in VND
 * @param {string} orderData.description - Description
 * @param {string} orderData.cancelUrl - Cancel URL
 * @param {string} orderData.returnUrl - Return URL
 * @param {Object} [orderData.buyerInfo] - Buyer information (optional)
 * @param {Array} [orderData.items] - Items array (optional)
 * @param {number} [orderData.expiredAt] - Expiration timestamp (optional)
 * @returns {Promise<Object>} - Payment link response
 */
async function createPaymentLink(orderData) {
  if (!CLIENT_ID || !API_KEY) {
    throw new Error('PayOS credentials are not configured. Please set PAYOS_CLIENT_ID and PAYOS_API_KEY in .env');
  }

  const {
    orderCode,
    amount,
    description,
    cancelUrl,
    returnUrl,
    buyerInfo = {},
    items = [],
    expiredAt
  } = orderData;

  // Prepare request body
  const requestBody = {
    orderCode,
    amount,
    description: description.substring(0, 9), // Limit to 9 characters for non-linked bank accounts
    cancelUrl,
    returnUrl
  };

  // Add optional fields
  if (buyerInfo.buyerName) requestBody.buyerName = buyerInfo.buyerName;
  if (buyerInfo.buyerEmail) requestBody.buyerEmail = buyerInfo.buyerEmail;
  if (buyerInfo.buyerPhone) requestBody.buyerPhone = buyerInfo.buyerPhone;
  if (buyerInfo.buyerCompanyName) requestBody.buyerCompanyName = buyerInfo.buyerCompanyName;
  if (buyerInfo.buyerTaxCode) requestBody.buyerTaxCode = buyerInfo.buyerTaxCode;
  if (buyerInfo.buyerAddress) requestBody.buyerAddress = buyerInfo.buyerAddress;
  if (items.length > 0) requestBody.items = items;
  if (expiredAt) requestBody.expiredAt = expiredAt;

  // Create signature
  const signature = createSignature({
    amount,
    cancelUrl,
    description: requestBody.description,
    orderCode,
    returnUrl
  });

  requestBody.signature = signature;

  try {
    const response = await axios.post(
      `${PAYOS_API_BASE_URL}/v2/payment-requests`,
      requestBody,
      {
        headers: {
          'x-client-id': CLIENT_ID,
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === '00') {
      return {
        success: true,
        data: response.data.data,
        signature: response.data.signature
      };
    } else {
      throw new Error(`PayOS API error: ${response.data.desc}`);
    }
  } catch (error) {
    console.error('❌ PayOS createPaymentLink error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.desc || error.message || 'Failed to create payment link'
    );
  }
}

/**
 * Get payment information
 * @param {string|number} id - Payment link ID or order code
 * @returns {Promise<Object>} - Payment information
 */
async function getPaymentInfo(id) {
  if (!CLIENT_ID || !API_KEY) {
    throw new Error('PayOS credentials are not configured');
  }

  try {
    const response = await axios.get(
      `${PAYOS_API_BASE_URL}/v2/payment-requests/${id}`,
      {
        headers: {
          'x-client-id': CLIENT_ID,
          'x-api-key': API_KEY
        }
      }
    );

    if (response.data.code === '00') {
      return {
        success: true,
        data: response.data.data,
        signature: response.data.signature
      };
    } else {
      throw new Error(`PayOS API error: ${response.data.desc}`);
    }
  } catch (error) {
    console.error('❌ PayOS getPaymentInfo error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.desc || error.message || 'Failed to get payment info'
    );
  }
}

/**
 * Cancel payment link
 * @param {string|number} id - Payment link ID or order code
 * @param {string} [cancellationReason] - Cancellation reason (optional)
 * @returns {Promise<Object>} - Cancellation response
 */
async function cancelPaymentLink(id, cancellationReason) {
  if (!CLIENT_ID || !API_KEY) {
    throw new Error('PayOS credentials are not configured');
  }

  try {
    const requestBody = {};
    if (cancellationReason) {
      requestBody.cancellationReason = cancellationReason;
    }

    const response = await axios.post(
      `${PAYOS_API_BASE_URL}/v2/payment-requests/${id}/cancel`,
      requestBody,
      {
        headers: {
          'x-client-id': CLIENT_ID,
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === '00') {
      return {
        success: true,
        data: response.data.data,
        signature: response.data.signature
      };
    } else {
      throw new Error(`PayOS API error: ${response.data.desc}`);
    }
  } catch (error) {
    console.error('❌ PayOS cancelPaymentLink error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.desc || error.message || 'Failed to cancel payment link'
    );
  }
}

/**
 * Get account balance (for payout account)
 * @returns {Promise<Object>} - Account balance information
 */
async function getAccountBalance() {
  if (!CLIENT_ID || !API_KEY) {
    throw new Error('PayOS credentials are not configured');
  }

  try {
    const response = await axios.get(
      `${PAYOS_API_BASE_URL}/v1/payouts-account/balance`,
      {
        headers: {
          'x-client-id': CLIENT_ID,
          'x-api-key': API_KEY
        }
      }
    );

    if (response.data.code === '00') {
      return {
        success: true,
        data: response.data.data
      };
    } else {
      throw new Error(`PayOS API error: ${response.data.desc}`);
    }
  } catch (error) {
    console.error('❌ PayOS getAccountBalance error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.desc || error.message || 'Failed to get account balance'
    );
  }
}

module.exports = {
  createPaymentLink,
  getPaymentInfo,
  cancelPaymentLink,
  getAccountBalance,
  createSignature,
  verifySignature
};

