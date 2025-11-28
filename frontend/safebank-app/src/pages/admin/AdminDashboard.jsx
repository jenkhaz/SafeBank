/**
 * Admin Dashboard Page
 * Main dashboard for admin users with quick actions
 */

import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { validatePassword } from '../../utils/validators';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import { KeyIcon, XMarkIcon } from '@heroicons/react/24/outline';

const AdminDashboard = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Change password modal
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm_password: '',
  });

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">User Management</h3>
            <p className="text-gray-600">Manage system users and roles</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-2">System Stats</h3>
            <p className="text-gray-600">View system statistics</p>
          </div>
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
