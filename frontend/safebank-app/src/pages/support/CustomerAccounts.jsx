/**
 * Support Agent Customer Accounts Page
 * Read-only view of all customer accounts for troubleshooting
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/validators';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import {
  MagnifyingGlassIcon,
  BanknotesIcon,
  XMarkIcon,
  EyeIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const CustomerAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // View details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountTransactions, setAccountTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, statusFilter, typeFilter, accounts]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.support.getAccounts();
      setAccounts(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...accounts];

    // Search filter (user ID, account number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (acc) =>
          acc.user_id.toString().includes(query) ||
          acc.account_number.toLowerCase().includes(query) ||
          acc.id.toString().includes(query)
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter((acc) => acc.status === statusFilter);
    }

    // Type filter
    if (typeFilter) {
      filtered = filtered.filter((acc) => acc.type === typeFilter);
    }

    setFilteredAccounts(filtered);
  };

  const handleViewDetails = async (account) => {
    setSelectedAccount(account);
    setShowDetailsModal(true);
    setTransactionsLoading(true);

    try {
      // Fetch account transactions
      const response = await api.transactions.getAccountTransactions(account.id);
      setAccountTransactions(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load account transactions');
      setAccountTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Frozen':
        return 'bg-yellow-100 text-yellow-800';
      case 'Closed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading customer accounts..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Customer Accounts</h2>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <LockClosedIcon className="h-3 w-3 inline mr-1" />
              Read-Only
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            View all customer accounts for troubleshooting purposes
          </p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Search by User ID, Account ID, or Account Number..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Frozen">Frozen</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field"
              >
                <option value="">All Types</option>
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
              </select>
            </div>
          </div>

          {(searchQuery || statusFilter || typeFilter) && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-primary-600 hover:text-primary-700"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing {filteredAccounts.length} of {accounts.length} accounts
        </div>

        {/* Accounts Table */}
        <div className="card">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12">
              <BanknotesIcon className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No accounts found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {searchQuery || statusFilter || typeFilter
                  ? 'Try adjusting your filters'
                  : 'No customer accounts available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {account.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {account.user_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {account.account_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                        {account.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(account.balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            account.status
                          )}`}
                        >
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(account.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(account)}
                          className="text-primary-600 hover:text-primary-900 flex items-center justify-end ml-auto"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Details Modal */}
        {showDetailsModal && selectedAccount && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Account Details
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Account ID: {selectedAccount.id} • User ID: {selectedAccount.user_id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedAccount(null);
                    setAccountTransactions([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Account Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Account Information
                  </h4>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-xs text-gray-500">Account Number</dt>
                      <dd className="text-sm font-medium text-gray-900 font-mono">
                        {selectedAccount.account_number}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Type</dt>
                      <dd className="text-sm font-medium text-gray-900 capitalize">
                        {selectedAccount.type}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Status</dt>
                      <dd>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            selectedAccount.status
                          )}`}
                        >
                          {selectedAccount.status}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">
                        {formatDate(selectedAccount.created_at)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Current Balance
                  </h4>
                  <p className="text-4xl font-bold text-gray-900">
                    {formatCurrency(selectedAccount.balance)}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Last updated: {formatDate(selectedAccount.updated_at || selectedAccount.created_at)}
                  </p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">
                  Recent Transactions
                </h4>

                {transactionsLoading ? (
                  <LoadingSpinner message="Loading transactions..." />
                ) : accountTransactions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-8">
                    No transactions found for this account
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Type
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                            Description
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {accountTransactions.slice(0, 10).map((tx) => {
                          const isCredit =
                            tx.receiver_account_id === selectedAccount.id;
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                {formatDate(tx.timestamp)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">
                                {tx.description || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <span
                                  className={`text-xs font-semibold ${
                                    isCredit ? 'text-green-600' : 'text-red-600'
                                  }`}
                                >
                                  {isCredit ? '+' : '-'}
                                  {formatCurrency(tx.amount)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Read-Only Notice */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center">
                  <LockClosedIcon className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    <strong>Read-Only Access:</strong> You can view account details but cannot make any changes. Contact an administrator to modify accounts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CustomerAccounts;
