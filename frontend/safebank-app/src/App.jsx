/**
 * Main App Component
 *
 * Sets up routing and authentication context
 * All routes are protected based on user roles
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForcePasswordChange from './pages/auth/ForcePasswordChange';

// Common pages
import DashboardRedirect from './pages/DashboardRedirect';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';

// Customer pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import Accounts from './pages/customer/Accounts';
import Transactions from './pages/customer/Transactions';
import Transfer from './pages/customer/Transfer';
import Tickets from './pages/customer/Tickets';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';

// Support pages
import SupportDashboard from './pages/support/SupportDashboard';
import TicketManagement from './pages/support/TicketManagement';
import CustomerAccounts from './pages/support/CustomerAccounts';

// Auditor pages
import AuditorDashboard from './pages/auditor/AuditorDashboard';
import AuditLogs from './pages/auditor/AuditLogs';
import SecurityEvents from './pages/auditor/SecurityEvents';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="/404" element={<NotFound />} />

          {/* Force Password Change - Public route for first-time login password change */}
          <Route path="/force-password-change" element={<ForcePasswordChange />} />

          {/* Dashboard Redirect - Redirects to appropriate dashboard based on role */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />

          {/* Customer Routes */}
          <Route
            path="/customer/*"
            element={
              <ProtectedRoute requiredRoles={['customer']}>
                <Routes>
                  <Route index element={<CustomerDashboard />} />
                  <Route path="accounts" element={<Accounts />} />
                  <Route path="transactions" element={<Transactions />} />
                  <Route path="transfer" element={<Transfer />} />
                  <Route path="tickets" element={<Tickets />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Routes>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<UserManagement />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Support Routes */}
          <Route
            path="/support/*"
            element={
              <ProtectedRoute requiredRoles={['support_agent']}>
                <Routes>
                  <Route index element={<SupportDashboard />} />
                  <Route path="tickets" element={<TicketManagement />} />
                  <Route path="accounts" element={<CustomerAccounts />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Auditor Routes */}
          <Route
            path="/auditor/*"
            element={
              <ProtectedRoute requiredRoles={['auditor']}>
                <Routes>
                  <Route index element={<AuditorDashboard />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="security-events" element={<SecurityEvents />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch all - 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
