/**
 * Secure API Client with Axios
 *
 * SECURITY FEATURES:
 * - Automatic JWT token injection in requests
 * - Request/Response interceptors for security
 * - XSS protection on responses
 * - CSRF token handling (if needed)
 * - Automatic logout on 401 errors
 * - Rate limiting handling
 */

import axios from 'axios';
import { getToken, removeToken, isTokenExpired } from './auth';
import { sanitizeObject } from './sanitize';

// Base URLs for different services
const BASE_URLS = {
  auth: import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:5001',
  accounts: import.meta.env.VITE_ACCOUNTS_SERVICE_URL || 'http://localhost:5002',
  admin: import.meta.env.VITE_ADMIN_SERVICE_URL || 'http://localhost:5003',
  support: import.meta.env.VITE_SUPPORT_SERVICE_URL || 'http://localhost:5004',
  audit: import.meta.env.VITE_AUDIT_SERVICE_URL || 'http://localhost:5005',
};

/**
 * Create axios instance for each service
 */
const createApiClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 30000, // 30 seconds
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - Add JWT token to all requests
  client.interceptors.request.use(
    (config) => {
      const token = getToken();

      // Check if token exists and is not expired
      if (token) {
        if (isTokenExpired(token)) {
          // Token expired - logout user (don't redirect, let the component handle it)
          removeToken();
          return Promise.reject(new Error('Token expired'));
        }

        // Add Authorization header
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log request for debugging (remove in production)
      if (import.meta.env.DEV) {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle errors and sanitize responses
  client.interceptors.response.use(
    (response) => {
      // Skip sanitization for blob responses (e.g., PDF downloads)
      const isBlob = response.data instanceof Blob || response.config?.responseType === 'blob';

      // Sanitize response data to prevent XSS (but not for binary data)
      if (!isBlob && response.data && typeof response.data === 'object') {
        response.data = sanitizeObject(response.data);
      }

      // Log response for debugging (remove in production)
      if (import.meta.env.DEV) {
        console.log(`[API Response] ${response.status} ${response.config.url}`);
      }

      return response;
    },
    (error) => {
      // Handle specific error codes
      if (error.response) {
        const { status, data } = error.response;

        switch (status) {
          case 401:
            // Unauthorized - token invalid or expired
            // Don't do hard redirect - let React handle navigation
            console.error('[API] Unauthorized - clearing token');
            removeToken();
            error.message = 'Session expired. Please login again.';
            break;

          case 403:
            // Forbidden - insufficient permissions
            console.error('[API] Forbidden - insufficient permissions');
            error.message = data?.msg || 'You do not have permission to perform this action';
            break;

          case 404:
            // Not found
            error.message = data?.msg || 'Resource not found';
            break;

          case 429:
            // Too many requests - rate limited
            console.error('[API] Rate limit exceeded');
            error.message = 'Too many requests. Please try again later.';
            break;

          case 500:
          case 502:
          case 503:
          case 504:
            // Server errors
            console.error('[API] Server error:', status);
            error.message = 'Service temporarily unavailable. Please try again later.';
            break;

          default:
            // Other errors
            error.message = data?.msg || error.message || 'An error occurred';
        }

        // Sanitize error message to prevent XSS
        if (typeof error.message === 'string') {
          error.message = error.message.replace(/<[^>]*>/g, '');
        }
      } else if (error.request) {
        // Network error - request made but no response
        console.error('[API] Network error:', error.message);
        error.message = 'Network error. Please check your connection.';
      } else {
        // Request setup error
        console.error('[API] Request error:', error.message);
      }

      return Promise.reject(error);
    }
  );

  return client;
};

// Create API clients for each service
export const authAPI = createApiClient(BASE_URLS.auth);
export const accountsAPI = createApiClient(BASE_URLS.accounts);
export const adminAPI = createApiClient(BASE_URLS.admin);
export const supportAPI = createApiClient(BASE_URLS.support);
export const auditAPI = createApiClient(BASE_URLS.audit);

// API Service Functions
export const api = {
  // Auth Service APIs
  auth: {
    register: (data) => authAPI.post('/auth/register', data),
    login: (data) => authAPI.post('/auth/login', data),
    forcePasswordChange: (data) => authAPI.post('/auth/force-password-change', data),
    getProfile: () => authAPI.get('/auth/me/roles-permissions'),
    changePassword: (data) => authAPI.post('/auth/admin/change-username-password', data),
    listUsers: () => authAPI.get('/auth/admin/list-users'),
    getUser: (userId) => authAPI.get(`/auth/admin/user/${userId}`),
    editUser: (data) => authAPI.post('/auth/admin/edit-user-profile', data),
  },

  // Accounts Service APIs
  accounts: {
    getMyAccounts: () => accountsAPI.get('/accounts/'),
    createAccount: (data) => accountsAPI.post('/accounts/', data),
    getAllAccounts: () => accountsAPI.get('/accounts/admin/all'),
    getAccountDetails: (accountId) => accountsAPI.get(`/accounts/admin/${accountId}`),
    createAccountForUser: (data) => accountsAPI.post('/accounts/admin/create', data),
  },

  // Transactions APIs
  transactions: {
    getMyTransactions: (params) => accountsAPI.get('/transactions/', { params }),
    getRecentTransactions: (accountId) =>
      accountsAPI.get('/transactions/recent-transactions', { params: { account_id: accountId } }),
    deposit: (data) => accountsAPI.post('/transactions/deposit', data),
    withdraw: (data) => accountsAPI.post('/transactions/withdraw', data),
    internalTransfer: (data) => accountsAPI.post('/transactions/internal', data),
    externalTransfer: (data) => accountsAPI.post('/transactions/external', data),
    topup: (data) => accountsAPI.post('/transactions/topup', data),
    exportPDF: (params) => accountsAPI.get('/transactions/export-pdf', { params, responseType: 'blob' }),
    getAllTransactions: () => accountsAPI.get('/transactions/admin/all'),
    getAccountTransactions: (accountId) => accountsAPI.get(`/transactions/admin/account/${accountId}`),
    freezeAccount: (data) => accountsAPI.post('/transactions/admin/change-freeze-status', data),
  },

  // Admin Service APIs
  admin: {
    changeCredentials: (data) => adminAPI.post('/admin/change-credentials', data),
    editUser: (data) => adminAPI.post('/admin/users/edit', data),
    createSupportAgent: (data) => adminAPI.post('/admin/users/create-support-agent', data),
    createAuditor: (data) => adminAPI.post('/admin/users/create-auditor', data),
    listUsers: () => adminAPI.get('/admin/users/list'),
    getUser: (userId) => adminAPI.get(`/admin/users/${userId}`),
  },

  // Support Service APIs
  support: {
    // Ticket management
    createTicket: (data) => supportAPI.post('/tickets/', data),
    getMyTickets: (params) => supportAPI.get('/tickets/', { params }),
    getTicket: (ticketId) => supportAPI.get(`/tickets/${ticketId}`),
    addNote: (ticketId, data) => supportAPI.post(`/tickets/${ticketId}/notes`, data),
    getAllTickets: (params) => supportAPI.get('/tickets/all', { params }),
    getTicketDetails: (ticketId) => supportAPI.get(`/tickets/all/${ticketId}`),
    updateTicketStatus: (ticketId, data) => supportAPI.put(`/tickets/${ticketId}/status`, data),
    assignTicket: (ticketId, data) => supportAPI.put(`/tickets/${ticketId}/assign`, data),
    addAgentNote: (ticketId, data) => supportAPI.post(`/tickets/${ticketId}/notes/agent`, data),

    // Account viewing (read-only)
    getAccounts: () => supportAPI.get('/support/accounts'),
    getAccount: (accountId) => supportAPI.get(`/support/accounts/${accountId}`),
    getTransactions: () => supportAPI.get('/support/transactions'),
    getAccountTransactions: (accountId) => supportAPI.get(`/support/transactions/account/${accountId}`),
    getProfile: () => supportAPI.get('/support/profile'),
    getMyAccount: () => supportAPI.get('/support/my-account'),
    getMyTransactions: (params) => supportAPI.get('/support/my-transactions', { params }),
  },

  // Audit Service APIs
  audit: {
    // Audit logs
    getAuditLogs: (params) => auditAPI.get('/audit/logs', { params }),
    getAuditLog: (logId) => auditAPI.get(`/audit/logs/${logId}`),
    getUserAuditTrail: (userId, params) => auditAPI.get(`/audit/logs/user/${userId}`, { params }),
    getAuditStats: () => auditAPI.get('/audit/stats'),

    // Security events
    getSecurityEvents: (params) => auditAPI.get('/security/events', { params }),
    getSecurityEvent: (eventId) => auditAPI.get(`/security/events/${eventId}`),
    investigateEvent: (eventId, data) => auditAPI.put(`/security/events/${eventId}/investigate`, data),
    getSecurityAlerts: () => auditAPI.get('/security/events/alerts'),
    getSecurityStats: () => auditAPI.get('/security/stats'),
  },
};

export default api;
