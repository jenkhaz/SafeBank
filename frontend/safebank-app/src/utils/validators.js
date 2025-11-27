/**
 * Input Validation Utilities
 *
 * SECURITY: Client-side validation is for UX
 * Server-side validation is the REAL security layer
 * Never trust client-side validation alone!
 */

/**
 * Validate email format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate password strength
 * Requirements: 8+ chars, uppercase, lowercase, digit, special char
 * @param {string} password - Password to validate
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export const validatePassword = (password) => {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate phone number (basic validation)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
export const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's 10-15 digits
  const phoneRegex = /^\d{10,15}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Validate full name (alphanumeric and spaces only)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid name format
 */
export const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;

  const trimmed = name.trim();
  if (trimmed.length < 2) return false;

  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  return nameRegex.test(trimmed);
};

/**
 * Validate monetary amount
 * @param {string|number} amount - Amount to validate
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export const validateAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return { valid: false, error: 'Amount is required' };
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return { valid: false, error: 'Amount must be a number' };
  }

  if (numAmount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  // Check for too many decimal places (max 2 for money)
  const amountStr = numAmount.toString();
  if (amountStr.includes('.')) {
    const decimals = amountStr.split('.')[1];
    if (decimals && decimals.length > 2) {
      return { valid: false, error: 'Amount cannot have more than 2 decimal places' };
    }
  }

  // Check for reasonable max amount (prevent overflow)
  if (numAmount > 1000000000) {
    return { valid: false, error: 'Amount is too large' };
  }

  return { valid: true, error: null };
};

/**
 * Validate account number format
 * @param {string} accountNumber - Account number to validate
 * @returns {boolean} - True if valid format
 */
export const isValidAccountNumber = (accountNumber) => {
  if (!accountNumber || typeof accountNumber !== 'string') return false;

  // SafeBank format: ACCT-{userId}-{identifier}
  // identifier can be digits or hex string (e.g., ACCT-5-1 or ACCT-5-a1b2c3d4)
  const accountRegex = /^ACCT-\d+-[a-zA-Z0-9]+$/;
  return accountRegex.test(accountNumber.trim());
};

/**
 * Validate account type
 * @param {string} type - Account type
 * @returns {boolean} - True if valid type
 */
export const isValidAccountType = (type) => {
  const validTypes = ['checking', 'savings'];
  return validTypes.includes(type);
};

/**
 * Validate ticket priority
 * @param {string} priority - Ticket priority
 * @returns {boolean} - True if valid priority
 */
export const isValidTicketPriority = (priority) => {
  const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
  return validPriorities.includes(priority);
};

/**
 * Validate ticket status
 * @param {string} status - Ticket status
 * @returns {boolean} - True if valid status
 */
export const isValidTicketStatus = (status) => {
  const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
  return validStatuses.includes(status);
};

/**
 * Sanitize and validate string length
 * @param {string} str - String to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {Object} - { valid: boolean, error: string|null }
 */
export const validateStringLength = (str, minLength, maxLength) => {
  if (!str || typeof str !== 'string') {
    return { valid: false, error: 'Value is required' };
  }

  const trimmed = str.trim();

  if (trimmed.length < minLength) {
    return { valid: false, error: `Must be at least ${minLength} characters` };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Must be no more than ${maxLength} characters` };
  }

  return { valid: true, error: null };
};

/**
 * Check for common injection patterns (basic protection)
 * @param {string} input - Input to check
 * @returns {boolean} - True if suspicious pattern detected
 */
export const containsSuspiciousPatterns = (input) => {
  if (!input || typeof input !== 'string') return false;

  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (e) {
    return '';
  }
};

/**
 * Check if password meets all requirements (simple boolean return)
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets all requirements
 */
export const isValidPassword = (password) => {
  return validatePassword(password).valid;
};

/**
 * Get password strength rating
 * @param {string} password - Password to check
 * @returns {string} - 'weak', 'medium', or 'strong'
 */
export const getPasswordStrength = (password) => {
  if (!password) return 'weak';

  let score = 0;

  // Length scoring
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Complexity scoring
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
};

export default {
  isValidEmail,
  validatePassword,
  isValidPassword,
  getPasswordStrength,
  isValidPhone,
  isValidName,
  validateAmount,
  isValidAccountNumber,
  isValidAccountType,
  isValidTicketPriority,
  isValidTicketStatus,
  validateStringLength,
  containsSuspiciousPatterns,
  formatCurrency,
  formatDate,
};
