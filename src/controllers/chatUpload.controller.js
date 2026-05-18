'use strict';

const multer = require('multer');
const storageAdapter = require('../services/storage.adapter');
const { validateChatFile } = require('../utils/chatFileValidation');

// Multer config: memory storage, 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/**
 * Upload a file for chat messages.
 * Validates auth, file presence, mime/size, then uploads to Cloudinary.
 */
async function uploadChatFile(req, res) {
  try {
    // 1. Check auth
    if (!req.user && !req.sessionId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 2. Check file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // 3. Validate file
    const validation = validateChatFile(req.file.mimetype, req.file.buffer.length);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 4. Upload to Cloudinary
    const resourceType = validation.isImage ? 'image' : 'raw';
    const result = await storageAdapter.upload(req.file.buffer, 'chat-uploads', resourceType);

    // 5. Return success
    return res.status(200).json({
      fileUrl: result.url,
      fileName: req.file.originalname,
      fileSize: req.file.buffer.length,
      fileMime: req.file.mimetype,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Upload failed' });
  }
}

module.exports = {
  upload,
  uploadChatFile,
};
