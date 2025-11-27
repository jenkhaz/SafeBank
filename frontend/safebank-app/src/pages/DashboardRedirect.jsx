/**
 * Dashboard Redirect Component
 *
 * Redirects users to their role-appropriate dashboard
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardRedirect = () => {
  const { user, isAdmin, isSupportAgent, isAuditor, isCustomer } = useAuth();

  // Redirect based on user's primary role
  if (isAdmin()) {
    return <Navigate to="/admin" replace />;
  } else if (isSupportAgent()) {
    return <Navigate to="/support" replace />;
  } else if (isAuditor()) {
    return <Navigate to="/auditor" replace />;
  } else if (isCustomer()) {
    return <Navigate to="/customer" replace />;
  }

  // Fallback to login if no valid role
  return <Navigate to="/login" replace />;
};

export default DashboardRedirect;
