/**
 * Admin Dashboard Page
 * Main dashboard for admin users with quick actions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { validatePassword } from '../../utils/validators';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import {
  KeyIcon,
  XMarkIcon,
  UsersIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Change password modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm_password: '',
  });

  // Fetch recent audit logs
  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const response = await api.audit.getAuditLogs({ limit: 5 });
        setRecentLogs(response.data.logs || []);
      } catch (err) {
        console.error('Failed to fetch audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentLogs();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordForm.new_password) {
      setError('New password is required');
      return;
    }

    // Validate new password
    const passwordValidation = validatePassword(passwordForm.new_password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setChangePasswordLoading(true);
    try {
      // Backend expects 'password' field (not 'new_password')
      await api.admin.changeCredentials({
        password: passwordForm.new_password,
      });

      setSuccess('Password changed successfully!');
      setShowChangePasswordModal(false);
      setPasswordForm({
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
          <button
            onClick={() => setShowChangePasswordModal(true)}
            className="btn-secondary flex items-center"
          >
            <KeyIcon className="h-5 w-5 mr-2" />
            Change Password
          </button>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Management Card */}
          <button
            onClick={() => navigate('/admin/users')}
            className="card hover:shadow-lg transition-shadow text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <UsersIcon className="h-8 w-8 text-blue-600" />
                  <h3 className="text-lg font-semibold ml-3">User Management</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  Manage system users, roles, and permissions
                </p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
          </button>

          {/* Account Management Card */}
          <button
            onClick={() => navigate('/admin/accounts')}
            className="card hover:shadow-lg transition-shadow text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <BanknotesIcon className="h-8 w-8 text-green-600" />
                  <h3 className="text-lg font-semibold ml-3">Accounts</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  View and manage customer accounts
                </p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
            </div>
          </button>

          {/* Audit Logs Card */}
          <button
            onClick={() => navigate('/auditor/audit-logs')}
            className="card hover:shadow-lg transition-shadow text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                  <h3 className="text-lg font-semibold ml-3">Audit Logs</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  View complete system audit logs
                </p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
            </div>
          </button>

          {/* Security Events Card */}
          <button
            onClick={() => navigate('/auditor/security-events')}
            className="card hover:shadow-lg transition-shadow text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <ShieldCheckIcon className="h-8 w-8 text-red-600" />
                  <h3 className="text-lg font-semibold ml-3">Security Events</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  Monitor and investigate security events
                </p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-red-600 transition-colors" />
            </div>
          </button>

          {/* Auditor Dashboard Card */}
          <button
            onClick={() => navigate('/auditor')}
            className="card hover:shadow-lg transition-shadow text-left group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <ChartBarIcon className="h-8 w-8 text-indigo-600" />
                  <h3 className="text-lg font-semibold ml-3">Audit Dashboard</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  View audit statistics and overview
                </p>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
            </div>
          </button>
        </div>

        {/* Recent Audit Logs Section */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Recent Audit Logs</h3>
            <button
              onClick={() => navigate('/auditor/audit-logs')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-4">Loading audit logs...</p>
          ) : recentLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No audit logs available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                          {log.service || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.username || `User #${log.user_id}`}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Change Password Modal */}
        {showChangePasswordModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Change Password
                </h3>
                <button
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setPasswordForm({ new_password: '', confirm_password: '' });
                    setError('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        new_password: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                    placeholder="Enter new password"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be 8+ characters with uppercase, lowercase, digit, and special character
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirm_password: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setPasswordForm({ new_password: '', confirm_password: '' });
                      setError('');
                    }}
                    className="btn-secondary flex-1"
                    disabled={changePasswordLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={changePasswordLoading}
                  >
                    {changePasswordLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
