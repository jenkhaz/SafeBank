/**
 * Admin User Management Page
 * Manage users, roles, and permissions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { sanitizeText } from '../../utils/sanitize';
import { isValidEmail, validatePassword, validateAmount, formatCurrency } from '../../utils/validators';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import {
  PlusIcon,
  PencilIcon,
  BanknotesIcon,
  XMarkIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit user modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    is_active: true,
    has_support_agent: false,
    has_auditor: false,
  });

  // Create support agent modal
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [createAgentLoading, setCreateAgentLoading] = useState(false);
  const [agentForm, setAgentForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // Create auditor modal
  const [showCreateAuditorModal, setShowCreateAuditorModal] = useState(false);
  const [createAuditorLoading, setCreateAuditorLoading] = useState(false);
  const [auditorForm, setAuditorForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  // View accounts modal
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [selectedUserAccounts, setSelectedUserAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [freezingAccount, setFreezingAccount] = useState(null);

  // Topup modal
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAccount, setTopupAccount] = useState(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // Create account for user modal
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [createAccountType, setCreateAccountType] = useState('checking');
  const [createAccountLoading, setCreateAccountLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, accountsResponse] = await Promise.all([
        api.admin.listUsers(),
        api.accounts.getAllAccounts(),
      ]);
      setUsers(usersResponse.data.users || usersResponse.data);
      setAccounts(accountsResponse.data);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email,
      full_name: user.full_name || '',
      phone: user.phone || '',
      is_active: user.is_active,
      has_support_agent: user.roles?.includes('support_agent') || false,
      has_auditor: user.roles?.includes('auditor') || false,
    });
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const sanitizedEmail = sanitizeText(editForm.email).trim();
    const sanitizedFullName = sanitizeText(editForm.full_name).trim();
    const sanitizedPhone = sanitizeText(editForm.phone).trim();

    if (!isValidEmail(sanitizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setEditLoading(true);
    try {
      // Calculate role changes
      const currentRoles = selectedUser.roles || [];
      const roles_to_add = [];
      const roles_to_remove = [];

      if (editForm.has_support_agent && !currentRoles.includes('support_agent')) {
        roles_to_add.push('support_agent');
      } else if (!editForm.has_support_agent && currentRoles.includes('support_agent')) {
        roles_to_remove.push('support_agent');
      }

      if (editForm.has_auditor && !currentRoles.includes('auditor')) {
        roles_to_add.push('auditor');
      } else if (!editForm.has_auditor && currentRoles.includes('auditor')) {
        roles_to_remove.push('auditor');
      }

      await api.admin.editUser({
        user_id: selectedUser.id,
        email: sanitizedEmail,
        full_name: sanitizedFullName,
        phone: sanitizedPhone || undefined,
        is_active: editForm.is_active,
        roles_to_add: roles_to_add.length > 0 ? roles_to_add : undefined,
        roles_to_remove: roles_to_remove.length > 0 ? roles_to_remove : undefined,
      });

      setSuccess('User updated successfully!');
      setShowEditModal(false);
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const sanitizedEmail = sanitizeText(agentForm.email).trim();
    const sanitizedFullName = sanitizeText(agentForm.full_name).trim();
    const sanitizedPhone = sanitizeText(agentForm.phone).trim();

    if (!isValidEmail(sanitizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(agentForm.password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    if (agentForm.password !== agentForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setCreateAgentLoading(true);
    try {
      await api.admin.createSupportAgent({
        email: sanitizedEmail,
        full_name: sanitizedFullName,
        phone: sanitizedPhone || undefined,
        password: agentForm.password,
      });

      setSuccess('Support agent created successfully!');
      setShowCreateAgentModal(false);
      setAgentForm({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create support agent');
    } finally {
      setCreateAgentLoading(false);
    }
  };

  const handleCreateAuditor = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const sanitizedEmail = sanitizeText(auditorForm.email).trim();
    const sanitizedFullName = sanitizeText(auditorForm.full_name).trim();
    const sanitizedPhone = sanitizeText(auditorForm.phone).trim();

    if (!isValidEmail(sanitizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(auditorForm.password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors.join('. '));
      return;
    }

    if (auditorForm.password !== auditorForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setCreateAuditorLoading(true);
    try {
      await api.admin.createAuditor({
        email: sanitizedEmail,
        full_name: sanitizedFullName,
        phone: sanitizedPhone || undefined,
        password: auditorForm.password,
      });

      setSuccess('Auditor created successfully!');
      setShowCreateAuditorModal(false);
      setAuditorForm({
        email: '',
        full_name: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
      await fetchData();
    } catch (err) {
      setError(err.message || 'Failed to create auditor');
    } finally {
      setCreateAuditorLoading(false);
    }
  };

  const handleViewAccounts = (user) => {
    const userAccounts = accounts.filter((acc) => acc.user_id === user.id);
    setSelectedUser(user);
    setSelectedUserAccounts(userAccounts);
    setShowAccountsModal(true);
  };

  const handleToggleFreezeAccount = async (account) => {
    setError('');
    setSuccess('');
    setFreezingAccount(account.id);

    try {
      const shouldFreeze = account.status === 'Active';
      await api.transactions.freezeAccount({
        account_id: account.id,
        freeze: shouldFreeze,
      });

      setSuccess(
        `Account ${shouldFreeze ? 'frozen' : 'unfrozen'} successfully!`
      );

      // Update local state
      setSelectedUserAccounts(
        selectedUserAccounts.map((acc) =>
          acc.id === account.id
            ? { ...acc, status: shouldFreeze ? 'Frozen' : 'Active' }
            : acc
        )
      );

      // Refresh all accounts
      const accountsResponse = await api.accounts.getAllAccounts();
      setAccounts(accountsResponse.data);
    } catch (err) {
      setError(err.message || 'Failed to update account status');
    } finally {
      setFreezingAccount(null);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amountValidation = validateAmount(topupAmount);
    if (!amountValidation.valid) {
      setError(amountValidation.error);
      return;
    }

    setTopupLoading(true);
    try {
      await api.transactions.topup({
        account_id: topupAccount.id,
        amount: parseFloat(topupAmount),
      });

      setSuccess(`Added ${formatCurrency(parseFloat(topupAmount))} to account successfully!`);
      setShowTopupModal(false);
      setTopupAmount('');
      setTopupAccount(null);

      // Refresh accounts
      const accountsResponse = await api.accounts.getAllAccounts();
      setAccounts(accountsResponse.data);

      // Update selected user accounts if modal is open
      if (selectedUser) {
        const userAccounts = accountsResponse.data.filter((acc) => acc.user_id === selectedUser.id);
        setSelectedUserAccounts(userAccounts);
      }
    } catch (err) {
      setError(err.message || 'Failed to add funds');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleCreateAccountForUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setCreateAccountLoading(true);
    try {
      await api.accounts.createAccountForUser({
        user_id: selectedUser.id,
        type: createAccountType,
      });

      setSuccess(`${createAccountType} account created for user successfully!`);
      setShowCreateAccountModal(false);
      setCreateAccountType('checking');

      // Refresh accounts
      const accountsResponse = await api.accounts.getAllAccounts();
      setAccounts(accountsResponse.data);

      // Update selected user accounts
      const userAccounts = accountsResponse.data.filter((acc) => acc.user_id === selectedUser.id);
      setSelectedUserAccounts(userAccounts);
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setCreateAccountLoading(false);
    }
  };

  const getRoleBadges = (roles) => {
    if (!roles || roles.length === 0) return null;

    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      support_agent: 'bg-blue-100 text-blue-800',
      auditor: 'bg-purple-100 text-purple-800',
      customer: 'bg-green-100 text-green-800',
    };

    return roles.map((role) => (
      <span
        key={role}
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          roleColors[role] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {role.replace('_', ' ')}
      </span>
    ));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading users..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage system users and their roles
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateAgentModal(true)}
              className="btn-secondary flex items-center"
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              New Support Agent
            </button>
            <button
              onClick={() => setShowCreateAuditorModal(true)}
              className="btn-primary flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Auditor
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && (
          <SuccessMessage message={success} onDismiss={() => setSuccess('')} />
        )}

        {/* Users Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Full Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accounts
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  const userAccountCount = accounts.filter(
                    (acc) => acc.user_id === user.id
                  ).length;

                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap">
                          {getRoleBadges(user.roles)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userAccountCount > 0 ? (
                          <button
                            onClick={() => handleViewAccounts(user)}
                            className="text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <BanknotesIcon className="h-4 w-4 mr-1" />
                            {userAccountCount} account{userAccountCount !== 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-gray-400">No accounts</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-primary-600 hover:text-primary-900 flex items-center justify-end ml-auto"
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit User: {selectedUser.email}
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editForm.is_active}
                      onChange={(e) =>
                        setEditForm({ ...editForm, is_active: e.target.checked })
                      }
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                    />
                    <span className="ml-2 text-sm text-gray-700">Account Active</span>
                  </label>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Additional Roles
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.has_support_agent}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            has_support_agent: e.target.checked,
                          })
                        }
                        disabled={selectedUser.roles?.includes('admin')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Support Agent
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editForm.has_auditor}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            has_auditor: e.target.checked,
                          })
                        }
                        disabled={selectedUser.roles?.includes('admin')}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className="ml-2 text-sm text-gray-700">Auditor</span>
                    </label>
                  </div>
                  {selectedUser.roles?.includes('admin') && (
                    <p className="mt-2 text-xs text-gray-500">
                      Cannot modify roles for admin users
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary flex-1"
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={editLoading}
                  >
                    {editLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Support Agent Modal */}
        {showCreateAgentModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Create Support Agent
                </h3>
                <button
                  onClick={() => setShowCreateAgentModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={agentForm.email}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, email: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={agentForm.full_name}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, full_name: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={agentForm.phone}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, phone: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={agentForm.password}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, password: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be 8+ characters with uppercase, lowercase, digit, and special
                    character
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={agentForm.confirmPassword}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, confirmPassword: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateAgentModal(false)}
                    className="btn-secondary flex-1"
                    disabled={createAgentLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={createAgentLoading}
                  >
                    {createAgentLoading ? 'Creating...' : 'Create Support Agent'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Auditor Modal */}
        {showCreateAuditorModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Auditor</h3>
                <button
                  onClick={() => setShowCreateAuditorModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateAuditor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={auditorForm.email}
                    onChange={(e) =>
                      setAuditorForm({ ...auditorForm, email: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={auditorForm.full_name}
                    onChange={(e) =>
                      setAuditorForm({ ...auditorForm, full_name: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={auditorForm.phone}
                    onChange={(e) =>
                      setAuditorForm({ ...auditorForm, phone: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={auditorForm.password}
                    onChange={(e) =>
                      setAuditorForm({ ...auditorForm, password: e.target.value })
                    }
                    className="input-field"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Must be 8+ characters with uppercase, lowercase, digit, and special
                    character
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={auditorForm.confirmPassword}
                    onChange={(e) =>
                      setAuditorForm({
                        ...auditorForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateAuditorModal(false)}
                    className="btn-secondary flex-1"
                    disabled={createAuditorLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={createAuditorLoading}
                  >
                    {createAuditorLoading ? 'Creating...' : 'Create Auditor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Accounts Modal */}
        {showAccountsModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white mb-10">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedUser.full_name || selectedUser.email}'s Accounts
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    User ID: {selectedUser.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAccountsModal(false);
                    setSelectedUserAccounts([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <button
                  onClick={() => setShowCreateAccountModal(true)}
                  className="btn-primary w-full"
                >
                  <PlusIcon className="h-5 w-5 mr-2 inline" />
                  Create New Account for User
                </button>
              </div>

              {selectedUserAccounts.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No accounts found for this user
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedUserAccounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-md font-semibold text-gray-900 capitalize">
                            {account.type} Account
                          </h4>
                          <p className="text-sm text-gray-500">
                            {account.account_number}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            account.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : account.status === 'Frozen'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {account.status}
                        </span>
                      </div>

                      <p className="text-2xl font-bold text-gray-900 mb-4">
                        {account.balance
                          ? `$${parseFloat(account.balance).toFixed(2)}`
                          : '$0.00'}
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setTopupAccount(account);
                            setShowTopupModal(true);
                          }}
                          disabled={account.status === 'Closed'}
                          className="btn-secondary text-sm"
                        >
                          Add Funds
                        </button>
                        <button
                          onClick={() => handleToggleFreezeAccount(account)}
                          disabled={
                            freezingAccount === account.id || account.status === 'Closed'
                          }
                          className={`btn-${
                            account.status === 'Active' ? 'danger' : 'primary'
                          } text-sm`}
                        >
                          {freezingAccount === account.id
                            ? 'Processing...'
                            : account.status === 'Active'
                            ? 'Freeze'
                            : account.status === 'Frozen'
                            ? 'Unfreeze'
                            : 'Closed'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Topup Modal */}
        {showTopupModal && topupAccount && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Funds</h3>
                <button
                  onClick={() => {
                    setShowTopupModal(false);
                    setTopupAccount(null);
                    setTopupAmount('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleTopup} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Account: <span className="font-medium">{topupAccount.account_number}</span>
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Current Balance:{' '}
                    <span className="font-bold text-gray-900">
                      {formatCurrency(parseFloat(topupAccount.balance || 0))}
                    </span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Add *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the amount you want to add to this account
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTopupModal(false);
                      setTopupAccount(null);
                      setTopupAmount('');
                    }}
                    className="btn-secondary flex-1"
                    disabled={topupLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={topupLoading}
                  >
                    {topupLoading ? 'Adding...' : 'Add Funds'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Account for User Modal */}
        {showCreateAccountModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Account</h3>
                <button
                  onClick={() => {
                    setShowCreateAccountModal(false);
                    setCreateAccountType('checking');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateAccountForUser} className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Creating account for:{' '}
                    <span className="font-medium">{selectedUser.email}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type *
                  </label>
                  <select
                    value={createAccountType}
                    onChange={(e) => setCreateAccountType(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="checking">Checking Account</option>
                    <option value="savings">Savings Account</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select the type of account to create
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateAccountModal(false);
                      setCreateAccountType('checking');
                    }}
                    className="btn-secondary flex-1"
                    disabled={createAccountLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={createAccountLoading}
                  >
                    {createAccountLoading ? 'Creating...' : 'Create Account'}
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

export default UserManagement;
