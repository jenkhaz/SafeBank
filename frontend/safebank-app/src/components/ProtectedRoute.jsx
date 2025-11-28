/**
 * Protected Route Component
 *
 * SECURITY: Implements role-based access control
 * Redirects unauthorized users to login or forbidden page
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as authUtils from '../utils/auth';

/**
 * ProtectedRoute - Wraps routes that require authentication
 * @param {Object} props
 * @param {React.Component} props.children - Component to render if authorized
 * @param {string[]} props.requiredRoles - Array of roles that can access (optional)
 * @param {string[]} props.requiredPermissions - Array of permissions needed (optional)
 * @param {boolean} props.requireAuth - Whether authentication is required (default: true)
 */
const ProtectedRoute = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  requireAuth = true,
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Also check localStorage for auth state (handles race condition after login)
  const tokenExists = !!authUtils.getToken();
  const storedUser = authUtils.getUser();

  // Show loading state while AuthContext is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If context says not authenticated, but we have a valid token in localStorage,
  // show loading (this handles the race condition after login)
  if (!isAuthenticated && tokenExists && storedUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication - use context OR localStorage
  const effectivelyAuthenticated = isAuthenticated || (tokenExists && storedUser);
  if (requireAuth && !effectivelyAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // For role checking, use context user if available, otherwise localStorage
  const effectiveUser = user || storedUser;

  // Check role-based access
  if (requiredRoles.length > 0 && effectiveUser) {
    const userRoles = effectiveUser.roles || [];
    const hasRequiredRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRequiredRole) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0 && effectiveUser) {
    const userPermissions = effectiveUser.permissions || [];
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission)
    );
    if (!hasRequiredPermission) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  // User is authenticated and authorized
  return children;
};

export default ProtectedRoute;
