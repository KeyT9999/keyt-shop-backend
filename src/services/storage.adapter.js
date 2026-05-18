'use strict';

const cloudinary = require('../config/cloudinary.config');

/**
 * Get the current storage provider name from environment variable.
 * Defaults to 'cloudinary' when STORAGE_PROVIDER is not set.
 * @returns {string} 'cloudinary' | 'r2'
 */
function getProvider() {
  return process.env.STORAGE_PROVIDER || 'cloudinary';
}

/**
 * Upload buffer to Cloudinary without transformation parameters.
 * Only passes folder and resource_type.
 * @param {Buffer} buffer - Image buffer to upload
 * @param {string} folder - Target folder path
 * @param {string} resourceType - Resource type (e.g. 'image')
 * @returns {Promise<{url: string, resourceId: string}>}
 */
function uploadToCloudinary(buffer, folder, resourceType) {
  return new Promise((resolve, reject) => {
    const base64Data = buffer.toString('base64');
    const dataUri = `data:${resourceType === 'image' ? 'image/webp' : 'application/octet-stream'};base64,${base64Data}`;

    cloudinary.uploader.upload(dataUri, {
      folder: folder,
      resource_type: resourceType
    }, (error, result) => {
      if (error) {
        reject(new Error(`cloudinary: ${error.message}`));
      } else {
        resolve({
          url: result.secure_url,
          resourceId: result.public_id
        });
      }
    });
  });
}

/**
 * Upload buffer to configured storage provider.
 * @param {Buffer} buffer - Compressed image buffer
 * @param {string} folder - Target folder path
 * @param {string} [resourceType='image'] - Resource type
 * @returns {Promise<{url: string, resourceId: string}>}
 * @throws {Error} With provider name and failure reason
 */
async function upload(buffer, folder, resourceType = 'image') {
  const provider = getProvider();

  if (provider === 'cloudinary') {
    return uploadToCloudinary(buffer, folder, resourceType);
  }

  if (provider === 'r2') {
    throw new Error('r2: R2 storage provider is not yet implemented');
  }

  throw new Error(`${provider}: Unknown storage provider`);
}

module.exports = {
  upload,
  getProvider
};
