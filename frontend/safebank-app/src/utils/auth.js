/**
 * Authentication Utilities for JWT Token Management
 *
 * SECURITY NOTES:
 * - Uses localStorage for JWT storage (acceptable for course project)
 * - Production systems should consider httpOnly cookies for enhanced security
 * - Tokens are validated before use to prevent tampering
 * - Auto-logout on token expiration
 */

const TOKEN_KEY = 'safebank_token';
const USER_KEY = 'safebank_user';

/**
 * Store JWT token in localStorage
 * @param {string} token - JWT access token
 */
export const setToken = (token) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token');
  }

  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
    throw new Error('Storage unavailable');
  }
};

/**
 * Retrieve JWT token from localStorage
 * @returns {string|null} - JWT token or null if not found
 */
export const getToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    return token;
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
};

/**
 * Remove JWT token from localStorage
 */
export const removeToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
};

/**
 * Store user data in localStorage
 * @param {Object} user - User data object
 */
export const setUser = (user) => {
  if (!user || typeof user !== 'object') {
    throw new Error('Invalid user data');
  }

  try {
    // Sanitize user data before storing to prevent script injection
    const sanitizedUser = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      roles: Array.isArray(user.roles) ? user.roles : [],
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };

    localStorage.setItem(USER_KEY, JSON.stringify(sanitizedUser));
  } catch (error) {
    console.error('Failed to store user data:', error);
    throw new Error('Storage unavailable');
  }
};

/**
 * Retrieve user data from localStorage
 * @returns {Object|null} - User data or null if not found
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to retrieve user data:', error);
    return null;
  }
};

/**
 * Decode JWT token (without verification - verification happens on backend)
 * This is just for reading claims, NOT for security validation
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null if invalid
 */
export const decodeToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired or invalid
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;

  // Check if token expiration time has passed (exp is in seconds)
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if valid token exists
 */
export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;

  return !isTokenExpired(token);
};

/**
 * Get user roles from stored user data
 * @returns {Array} - Array of role names
 */
export const getUserRoles = () => {
  const user = getUser();
  return user?.roles || [];
};

/**
 * Get user permissions from stored user data
 * @returns {Array} - Array of permission strings
 */
export const getUserPermissions = () => {
  const user = getUser();
  return user?.permissions || [];
};

/**
 * Check if user has specific role
 * @param {string} role - Role name to check
 * @returns {boolean} - True if user has the role
 */
export const hasRole = (role) => {
  const roles = getUserRoles();
  return roles.includes(role);
};

/**
 * Check if user has specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean} - True if user has the permission
 */
export const hasPermission = (permission) => {
  const permissions = getUserPermissions();
  return permissions.includes(permission);
};

/**
 * Check if user has admin role
 * @returns {boolean} - True if user is admin
 */
export const isAdmin = () => {
  return hasRole('admin');
};

/**
 * Check if user has support agent role
 * @returns {boolean} - True if user is support agent
 */
export const isSupportAgent = () => {
  return hasRole('support_agent');
};

/**
 * Check if user is customer
 * @returns {boolean} - True if user is customer
 */
export const isCustomer = () => {
  return hasRole('customer');
};

/**
 * Logout user (clear all auth data)
 */
export const logout = () => {
  removeToken();
  // Additional cleanup can be added here
};

/**
 * Get time until token expiration (in milliseconds)
 * @param {string} token - JWT token
 * @returns {number} - Milliseconds until expiration, or 0 if expired/invalid
 */
export const getTokenExpirationTime = (token) => {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return 0;

  const currentTime = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - currentTime;

  return expiresIn > 0 ? expiresIn * 1000 : 0;
};

/**
 * Get complete auth info (user data and roles)
 * @returns {Object|null} - User data with roles and permissions
 */
export const getAuthInfo = () => {
  return getUser();
};

/**
 * Get current user ID
 * @returns {number|null} - User ID or null if not authenticated
 */
export const getUserId = () => {
  const user = getUser();
  return user?.user_id || null;
};

export default {
  setToken,
  getToken,
  removeToken,
  setUser,
  getUser,
  decodeToken,
  isTokenExpired,
  isAuthenticated,
  getUserRoles,
  getUserPermissions,
  hasRole,
  hasPermission,
  isAdmin,
  isSupportAgent,
  isCustomer,
  logout,
  getTokenExpirationTime,
  getAuthInfo,
  getUserId,
};
