/**
 * Transaction History Page
 * View all transactions with filters and PDF export
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/validators';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import {
  ArrowDownTrayIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

const Transactions = () => {
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [exportingPDF, setExportingPDF] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    type: '',
    min_amount: '',
    max_amount: '',
  });

  // Selected account from navigation (optional)
  const [selectedAccountId, setSelectedAccountId] = useState(
    location.state?.selectedAccount?.id || null
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch accounts
        const accountsResponse = await api.accounts.getMyAccounts();
        setAccounts(accountsResponse.data);

        // Fetch transactions
        await fetchTransactions();
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchTransactions = async (filterParams = {}) => {
    try {
      setLoading(true);
      const response = await api.transactions.getMyTransactions(filterParams);
      setTransactions(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Build filter params
    const params = {};
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;
    if (filters.type) params.type = filters.type;
    if (filters.min_amount) params.min_amount = parseFloat(filters.min_amount);
    if (filters.max_amount) params.max_amount = parseFloat(filters.max_amount);

    await fetchTransactions(params);
  };

  const handleClearFilters = async () => {
    setFilters({
      start_date: '',
      end_date: '',
      type: '',
      min_amount: '',
      max_amount: '',
    });
    await fetchTransactions();
  };

  const handleExportPDF = async () => {
    setError('');
    setSuccess('');
    setExportingPDF(true);

    try {
      // Build filter params
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;
      if (filters.type) params.type = filters.type;
      if (filters.min_amount) params.min_amount = parseFloat(filters.min_amount);
      if (filters.max_amount) params.max_amount = parseFloat(filters.max_amount);

      const response = await api.transactions.exportPDF(params);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `transactions_${new Date().toISOString().split('T')[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess('Transaction history exported successfully!');
    } catch (err) {
      setError(err.message || 'Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const getAccountById = (accountId) => {
    return accounts.find((acc) => acc.id === accountId);
  };

  const isIncomingTransaction = (tx) => {
    // Check if this transaction credited the user's account
    const userAccountIds = accounts.map((acc) => acc.id);

    // For deposits and withdrawals, sender and receiver are the same
    if (tx.type === 'deposit') return true;
    if (tx.type === 'withdrawal') return false;

    // For transfers, check if receiver is user's account
    return userAccountIds.includes(tx.receiver_account_id);
  };

  const getTransactionTypeLabel = (tx) => {
    switch (tx.type) {
      case 'deposit':
        return 'Deposit';
      case 'withdrawal':
        return 'Withdrawal';
      case 'internal':
        return 'Internal Transfer';
      case 'external':
        return 'External Transfer';
      default:
        return tx.type;
    }
  };

  const getFilteredTransactions = () => {
    if (!selectedAccountId) return transactions;

    return transactions.filter(
      (tx) =>
        tx.sender_account_id === selectedAccountId ||
        tx.receiver_account_id === selectedAccountId
    );
  };

  const filteredTransactions = getFilteredTransactions();

  if (loading && transactions.length === 0) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading transactions..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
            <p className="mt-1 text-sm text-gray-500">
              View and export your transaction history
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center"
            >
              <FunnelIcon className="h-5 w-5 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </button>
            <button
              onClick={handleExportPDF}
              className="btn-primary flex items-center"
              disabled={exportingPDF || filteredTransactions.length === 0}
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              {exportingPDF ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Account Filter (if navigated from account) */}
        {location.state?.selectedAccount && (
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Showing transactions for: {location.state.selectedAccount.type} Account
                </p>
                <p className="text-xs text-blue-700">
                  {location.state.selectedAccount.account_number}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAccountId(null);
                  window.history.replaceState({}, document.title);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Show All Accounts
              </button>
            </div>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <form onSubmit={handleApplyFilters} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) =>
                      setFilters({ ...filters, start_date: e.target.value })
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    className="input-field"
                  />
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="input-field"
                  >
                    <option value="">All Types</option>
                    <option value="internal">Internal Transfer</option>
                    <option value="external">External Transfer</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Note: Deposits and withdrawals shown separately
                  </p>
                </div>

                {/* Amount Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={filters.min_amount}
                      onChange={(e) =>
                        setFilters({ ...filters, min_amount: e.target.value })
                      }
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={filters.max_amount}
                      onChange={(e) =>
                        setFilters({ ...filters, max_amount: e.target.value })
                      }
                      className="input-field"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={loading}>
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Clear Filters
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transactions List */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Transactions ({filteredTransactions.length})
          </h3>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
              {Object.values(filters).some((f) => f) && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-primary-600 hover:text-primary-700 text-sm"
                >
                  Clear filters to see all transactions
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To Account
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((tx) => {
                    const isIncoming = isIncomingTransaction(tx);
                    const senderAccount = getAccountById(tx.sender_account_id);
                    const receiverAccount = getAccountById(tx.receiver_account_id);

                    return (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(tx.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getTransactionTypeLabel(tx)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {tx.description || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {senderAccount
                            ? `${senderAccount.type} (${senderAccount.account_number})`
                            : tx.sender_account_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {receiverAccount
                            ? `${receiverAccount.type} (${receiverAccount.account_number})`
                            : tx.receiver_account_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end">
                            {isIncoming ? (
                              <ArrowDownIcon className="h-4 w-4 text-green-600 mr-1" />
                            ) : (
                              <ArrowUpIcon className="h-4 w-4 text-red-600 mr-1" />
                            )}
                            <span
                              className={`text-sm font-semibold ${
                                isIncoming ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {isIncoming ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Card */}
        {filteredTransactions.length > 0 && (
          <div className="card bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredTransactions.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Incoming</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    filteredTransactions
                      .filter((tx) => isIncomingTransaction(tx))
                      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Outgoing</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    filteredTransactions
                      .filter((tx) => !isIncomingTransaction(tx))
                      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
