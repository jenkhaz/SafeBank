/**
 * XSS Protection Utilities using DOMPurify
 *
 * SECURITY: All user-generated content MUST be sanitized before rendering
 * This prevents XSS attacks by stripping malicious scripts from user input
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} dirty - Potentially unsafe HTML content
 * @returns {string} - Sanitized safe HTML
 */
export const sanitizeHTML = (dirty) => {
  if (typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitize text content (strips all HTML tags)
 * Use this for plain text fields like names, descriptions
 * @param {string} dirty - Potentially unsafe text
 * @returns {string} - Sanitized plain text
 */
export const sanitizeText = (dirty) => {
  if (typeof dirty !== 'string') return '';

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitize URL to prevent javascript: protocol attacks
 * @param {string} url - Potentially unsafe URL
 * @returns {string} - Sanitized URL or empty string if invalid
 */
export const sanitizeURL = (url) => {
  if (typeof url !== 'string') return '';

  try {
    const parsed = new URL(url, window.location.origin);
    // Only allow http, https, and mailto protocols
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch (e) {
    // Invalid URL
  }

  return '';
};

/**
 * Escape HTML entities manually (additional layer of protection)
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
export const escapeHTML = (text) => {
  if (typeof text !== 'string') return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Sanitize object recursively (for API responses)
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeText(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }

  return sanitized;
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  escapeHTML,
  sanitizeObject,
};
