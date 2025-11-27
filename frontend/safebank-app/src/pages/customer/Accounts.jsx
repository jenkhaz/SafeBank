/**
 * Accounts Page
 * View accounts, create new accounts, deposit, withdraw
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatCurrency, validateAmount, isValidAccountType } from '../../utils/validators';
import { sanitizeText } from '../../utils/sanitize';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import {
  PlusIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create account modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [accountType, setAccountType] = useState('checking');

  // Deposit modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAccount, setDepositAccount] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  // Withdraw modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAccount, setWithdrawAccount] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.accounts.getMyAccounts();
      setAccounts(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isValidAccountType(accountType)) {
      setError('Invalid account type');
      return;
    }

    setCreateLoading(true);
    try {
      await api.accounts.createAccount({ type: accountType });
      setSuccess(`${accountType} account created successfully!`);
      setShowCreateModal(false);
      setAccountType('checking');
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amountValidation = validateAmount(depositAmount);
    if (!amountValidation.valid) {
      setError(amountValidation.error);
      return;
    }

    const sanitizedDescription = sanitizeText(depositDescription).trim();

    setDepositLoading(true);
    try {
      await api.transactions.deposit({
        account_id: depositAccount.id,
        amount: parseFloat(depositAmount),
        description: sanitizedDescription || 'Deposit',
      });
      setSuccess(`Deposited ${formatCurrency(parseFloat(depositAmount))} successfully!`);
      setShowDepositModal(false);
      setDepositAmount('');
      setDepositDescription('');
      setDepositAccount(null);
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to deposit');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amountValidation = validateAmount(withdrawAmount);
    if (!amountValidation.valid) {
      setError(amountValidation.error);
      return;
    }

    const sanitizedDescription = sanitizeText(withdrawDescription).trim();

    setWithdrawLoading(true);
    try {
      await api.transactions.withdraw({
        account_id: withdrawAccount.id,
        amount: parseFloat(withdrawAmount),
        description: sanitizedDescription || 'Withdrawal',
      });
      setSuccess(`Withdrew ${formatCurrency(parseFloat(withdrawAmount))} successfully!`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawDescription('');
      setWithdrawAccount(null);
      await fetchAccounts();
    } catch (err) {
      setError(err.message || 'Failed to withdraw');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading accounts..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">My Accounts</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Account
          </button>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div className="card text-center py-12">
            <BanknotesIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No accounts yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by creating your first bank account.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2 inline" />
              Create Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((account) => (
              <div key={account.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 capitalize">
                      {account.type}
                    </h3>
                    <p className="text-sm text-gray-500">{account.account_number}</p>
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

                <div className="mb-6">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(account.balance)}
                  </p>
                </div>

                {account.status === 'Active' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setDepositAccount(account);
                        setShowDepositModal(true);
                      }}
                      className="btn-primary flex items-center justify-center text-sm"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      Deposit
                    </button>
                    <button
                      onClick={() => {
                        setWithdrawAccount(account);
                        setShowWithdrawModal(true);
                      }}
                      className="btn-secondary flex items-center justify-center text-sm"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                      Withdraw
                    </button>
                  </div>
                )}
                {account.status !== 'Active' && (
                  <p className="text-center text-sm text-red-600">
                    Account is {account.status}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Account Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Account
                </h3>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="btn-secondary flex-1"
                      disabled={createLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                      disabled={createLoading}
                    >
                      {createLoading ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {showDepositModal && depositAccount && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Deposit to {depositAccount.type} Account
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {depositAccount.account_number}
                </p>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={depositDescription}
                      onChange={(e) => setDepositDescription(e.target.value)}
                      className="input-field"
                      placeholder="e.g., Paycheck deposit"
                      maxLength={255}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDepositModal(false);
                        setDepositAmount('');
                        setDepositDescription('');
                      }}
                      className="btn-secondary flex-1"
                      disabled={depositLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                      disabled={depositLoading}
                    >
                      {depositLoading ? 'Processing...' : 'Deposit'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && withdrawAccount && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Withdraw from {withdrawAccount.type} Account
                </h3>
                <p className="text-sm text-gray-500 mb-2">
                  {withdrawAccount.account_number}
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Available: <span className="font-semibold">{formatCurrency(withdrawAccount.balance)}</span>
                </p>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={withdrawAccount.balance}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      value={withdrawDescription}
                      onChange={(e) => setWithdrawDescription(e.target.value)}
                      className="input-field"
                      placeholder="e.g., ATM withdrawal"
                      maxLength={255}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowWithdrawModal(false);
                        setWithdrawAmount('');
                        setWithdrawDescription('');
                      }}
                      className="btn-secondary flex-1"
                      disabled={withdrawLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                      disabled={withdrawLoading}
                    >
                      {withdrawLoading ? 'Processing...' : 'Withdraw'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Accounts;
