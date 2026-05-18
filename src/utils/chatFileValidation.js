const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip'
];
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DOC_MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate a file for chat upload
 * @param {string} mimetype - The MIME type of the file
 * @param {number} size - The file size in bytes
 * @returns {{ valid: boolean, isImage: boolean, error: string|null }}
 */
function validateChatFile(mimetype, size) {
  const isImage = ALLOWED_IMAGE_MIMES.includes(mimetype);
  const isDoc = ALLOWED_DOC_MIMES.includes(mimetype);

  if (!isImage && !isDoc) {
    return { valid: false, isImage: false, error: 'Loại file không được hỗ trợ' };
  }

  if (isImage && size > IMAGE_MAX_SIZE) {
    return { valid: false, isImage: true, error: 'Ảnh vượt quá 5MB' };
  }

  if (isDoc && size > DOC_MAX_SIZE) {
    return { valid: false, isImage: false, error: 'File vượt quá 10MB' };
  }

  return { valid: true, isImage, error: null };
}

module.exports = {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_DOC_MIMES,
  IMAGE_MAX_SIZE,
  DOC_MAX_SIZE,
  validateChatFile
};
