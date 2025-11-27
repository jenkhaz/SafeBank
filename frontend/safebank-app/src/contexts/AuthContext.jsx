/**
 * Authentication Context
 *
 * Provides global authentication state and methods
 * Manages user login, logout, and token refresh
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authUtils from '../utils/auth';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Load user from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        if (authUtils.isAuthenticated()) {
          const storedUser = authUtils.getUser();
          setUser(storedUser);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
        authUtils.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Auto-logout before token expires (5 minutes before expiration)
  useEffect(() => {
    if (!user) return;

    const token = authUtils.getToken();
    if (!token) return;

    const expirationTime = authUtils.getTokenExpirationTime(token);
    if (expirationTime <= 0) {
      logout();
      return;
    }

    // Set timeout to logout 5 minutes before expiration
    const logoutTime = Math.max(0, expirationTime - 5 * 60 * 1000);
    const timeoutId = setTimeout(() => {
      logout();
      navigate('/login?session=expired');
    }, logoutTime);

    return () => clearTimeout(timeoutId);
  }, [user, navigate]);

  // Login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.auth.login({ email, password });
      const { access_token, user: userData, requires_password_change } = response.data;

      // Check if password change is required
      if (requires_password_change) {
        return { success: false, requiresPasswordChange: true, email };
      }

      // Store token and user data
      authUtils.setToken(access_token);

      // Get full user profile with roles and permissions
      const profileResponse = await api.auth.getProfile();
      const fullUserData = {
        ...userData,
        roles: profileResponse.data.roles || [],
        permissions: profileResponse.data.permissions || [],
      };

      authUtils.setUser(fullUserData);
      setUser(fullUserData);

      return { success: true, user: fullUserData };
    } catch (err) {
      // Check if error response indicates password change required (403 with must_change_password)
      if (err.response?.status === 403 &&
          (err.response?.data?.must_change_password ||
           err.response?.data?.msg?.toLowerCase().includes('password change required'))) {
        return { success: false, requiresPasswordChange: true, email };
      }
      const errorMessage = err.response?.data?.msg || err.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Register function
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.auth.register(userData);

      // Auto-login after successful registration
      if (response.data) {
        const loginResult = await login(userData.email, userData.password);
        return loginResult;
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.msg || err.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [login]);

  // Logout function
  const logout = useCallback(() => {
    authUtils.logout();
    setUser(null);
    setError(null);
  }, []);

  // Force password change function
  const forcePasswordChange = useCallback(async (email, currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);

      await api.auth.forcePasswordChange({
        email,
        current_password: currentPassword,
        new_password: newPassword,
      });

      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.msg || err.message || 'Password change failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh user profile
  const refreshProfile = useCallback(async () => {
    try {
      const response = await api.auth.getProfile();
      const updatedUser = {
        ...user,
        roles: response.data.roles || [],
        permissions: response.data.permissions || [],
      };
      authUtils.setUser(updatedUser);
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      console.error('Failed to refresh profile:', err);
      return { success: false, error: err.message };
    }
  }, [user]);

  // Check if user has specific role
  const hasRole = useCallback((role) => {
    return user?.roles?.includes(role) || false;
  }, [user]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  // Check if user is support agent
  const isSupportAgent = useCallback(() => {
    return hasRole('support_agent');
  }, [hasRole]);

  // Check if user is customer
  const isCustomer = useCallback(() => {
    return hasRole('customer');
  }, [hasRole]);

  // Check if user is auditor
  const isAuditor = useCallback(() => {
    return hasRole('auditor');
  }, [hasRole]);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    forcePasswordChange,
    refreshProfile,
    hasRole,
    hasPermission,
    isAdmin,
    isSupportAgent,
    isCustomer,
    isAuditor,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
