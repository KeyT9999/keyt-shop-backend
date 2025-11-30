/**
 * Normalize date string to dd/MM/yyyy format
 * Accepts formats like: 19/4/2025, 19/04/2025, 19-4-2025, 19.4.2025
 * @param {string} input - Date string in various formats
 * @returns {string} - Normalized date string (dd/MM/yyyy)
 */
function normalizeDate(input) {
  if (!input) return '';
  // Replace - and . with /
  return input.replace(/-/g, '/').replace(/\./g, '/').trim();
}

/**
 * Parse date from flexible format (dd/MM/yyyy, dd/M/yyyy, etc.)
 * @param {string} dateStr - Date string
 * @returns {Date} - Parsed Date object
 */
function parseFlexibleDate(dateStr) {
  const normalized = normalizeDate(dateStr);
  const parts = normalized.split('/');
  
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected dd/MM/yyyy`);
  }
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error(`Invalid date values: ${dateStr}`);
  }
  
  const date = new Date(year, month, day);
  
  // Validate date
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  
  return date;
}

/**
 * Format date to dd/MM/yyyy
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

module.exports = { normalizeDate, parseFlexibleDate, formatDate };

