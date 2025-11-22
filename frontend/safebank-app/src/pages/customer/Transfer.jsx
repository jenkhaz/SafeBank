/**
 * Transfer Page
 * Internal transfers (between own accounts) and External transfers (to other users)
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatCurrency, validateAmount, isValidAccountNumber } from '../../utils/validators';
import { sanitizeText } from '../../utils/sanitize';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import { ArrowPathIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const Transfer = () => {
  const location = useLocation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Transfer type selection
  const [transferType, setTransferType] = useState('internal'); // 'internal' or 'external'

  // Internal transfer form
  const [senderAccountId, setSenderAccountId] = useState('');
  const [receiverAccountId, setReceiverAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // External transfer form
  const [externalSenderAccountId, setExternalSenderAccountId] = useState('');
  const [receiverAccountNumber, setReceiverAccountNumber] = useState('');
  const [externalAmount, setExternalAmount] = useState('');
  const [externalDescription, setExternalDescription] = useState('');

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await api.accounts.getMyAccounts();
        const activeAccounts = response.data.filter(acc => acc.status === 'Active');
        setAccounts(activeAccounts);

        // Pre-select account from navigation state
        if (location.state?.selectedAccount) {
          setSenderAccountId(location.state.selectedAccount.id.toString());
          setExternalSenderAccountId(location.state.selectedAccount.id.toString());
        } else if (activeAccounts.length > 0) {
          setSenderAccountId(activeAccounts[0].id.toString());
          setExternalSenderAccountId(activeAccounts[0].id.toString());
        }
      } catch (err) {
        setError(err.message || 'Failed to load accounts');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [location.state]);

  const handleInternalTransfer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (senderAccountId === receiverAccountId) {
      setError('Cannot transfer to the same account');
      return;
    }

    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      setError(amountValidation.error);
      return;
    }

    const sanitizedDescription = sanitizeText(description).trim();

    setSubmitting(true);
    try {
      await api.transactions.internalTransfer({
        sender_account_id: parseInt(senderAccountId),
        receiver_account_id: parseInt(receiverAccountId),
        amount: parseFloat(amount),
        description: sanitizedDescription || 'Internal transfer',
      });

      setSuccess(
        `Successfully transferred ${formatCurrency(parseFloat(amount))} between your accounts!`
      );

      // Reset form
      setAmount('');
      setDescription('');

      // Reload accounts to show updated balances
      const response = await api.accounts.getMyAccounts();
      const activeAccounts = response.data.filter(acc => acc.status === 'Active');
      setAccounts(activeAccounts);
    } catch (err) {
      setError(err.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExternalTransfer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!receiverAccountNumber.trim()) {
      setError('Please enter recipient account number');
      return;
    }

    if (!isValidAccountNumber(receiverAccountNumber.trim())) {
      setError('Invalid account number format (e.g., ACCT-123-456)');
      return;
    }

    const amountValidation = validateAmount(externalAmount);
    if (!amountValidation.valid) {
      setError(amountValidation.error);
      return;
    }

    const sanitizedDescription = sanitizeText(externalDescription).trim();
    const sanitizedAccountNumber = sanitizeText(receiverAccountNumber).trim();

    setSubmitting(true);
    try {
      await api.transactions.externalTransfer({
        sender_account_id: parseInt(externalSenderAccountId),
        receiver_account_number: sanitizedAccountNumber,
        amount: parseFloat(externalAmount),
        description: sanitizedDescription || 'External transfer',
      });

      setSuccess(
        `Successfully transferred ${formatCurrency(
          parseFloat(externalAmount)
        )} to ${sanitizedAccountNumber}!`
      );

      // Reset form
      setReceiverAccountNumber('');
      setExternalAmount('');
      setExternalDescription('');

      // Reload accounts to show updated balances
      const response = await api.accounts.getMyAccounts();
      const activeAccounts = response.data.filter(acc => acc.status === 'Active');
      setAccounts(activeAccounts);
    } catch (err) {
      setError(err.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getAccountById = (id) => {
    return accounts.find((acc) => acc.id === parseInt(id));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading transfer form..." />
      </DashboardLayout>
    );
  }

  if (accounts.length === 0) {
    return (
      <DashboardLayout>
        <div className="card text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No Active Accounts</h3>
          <p className="mt-2 text-sm text-gray-500">
            You need at least one active account to make transfers.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transfer Money</h2>
          <p className="mt-1 text-sm text-gray-500">
            Transfer funds between your accounts or to other users
          </p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Transfer Type Selector */}
        <div className="card">
          <div className="flex border-b">
            <button
              onClick={() => setTransferType('internal')}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                transferType === 'internal'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowPathIcon className="h-5 w-5 inline mr-2" />
              Between My Accounts
            </button>
            <button
              onClick={() => setTransferType('external')}
              className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${
                transferType === 'external'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowRightIcon className="h-5 w-5 inline mr-2" />
              To Another User
            </button>
          </div>

          <div className="p-6">
            {transferType === 'internal' ? (
              /* Internal Transfer Form */
              <form onSubmit={handleInternalTransfer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* From Account */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      From Account *
                    </label>
                    <select
                      value={senderAccountId}
                      onChange={(e) => setSenderAccountId(e.target.value)}
                      className="input-field"
                      required
                    >
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.type} - {account.account_number} (
                          {formatCurrency(account.balance)})
                        </option>
                      ))}
                    </select>
                    {senderAccountId && getAccountById(senderAccountId) && (
                      <p className="mt-1 text-sm text-gray-500">
                        Available: {formatCurrency(getAccountById(senderAccountId).balance)}
                      </p>
                    )}
                  </div>

                  {/* To Account */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      To Account *
                    </label>
                    <select
                      value={receiverAccountId}
                      onChange={(e) => setReceiverAccountId(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">Select account...</option>
                      {accounts
                        .filter((acc) => acc.id !== parseInt(senderAccountId))
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.type} - {account.account_number}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="e.g., Transfer to savings"
                    maxLength={255}
                  />
                </div>

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Transfer Money'}
                </button>
              </form>
            ) : (
              /* External Transfer Form */
              <form onSubmit={handleExternalTransfer} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Account *
                  </label>
                  <select
                    value={externalSenderAccountId}
                    onChange={(e) => setExternalSenderAccountId(e.target.value)}
                    className="input-field"
                    required
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.type} - {account.account_number} (
                        {formatCurrency(account.balance)})
                      </option>
                    ))}
                  </select>
                  {externalSenderAccountId && getAccountById(externalSenderAccountId) && (
                    <p className="mt-1 text-sm text-gray-500">
                      Available: {formatCurrency(getAccountById(externalSenderAccountId).balance)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Account Number *
                  </label>
                  <input
                    type="text"
                    value={receiverAccountNumber}
                    onChange={(e) => setReceiverAccountNumber(e.target.value)}
                    className="input-field"
                    placeholder="ACCT-5-abc12345"
                    required
                    maxLength={50}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Copy the account number from recipient's account details
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={externalAmount}
                    onChange={(e) => setExternalAmount(e.target.value)}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={externalDescription}
                    onChange={(e) => setExternalDescription(e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="e.g., Payment for services"
                    maxLength={255}
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> External transfers are final. Please verify the
                    recipient account number before proceeding.
                  </p>
                </div>

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Processing...' : 'Send Money'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Recent Accounts Info */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="border rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 capitalize">{account.type}</p>
                <p className="text-xs text-gray-500">{account.account_number}</p>
                <p className="text-lg font-bold text-gray-900 mt-2">
                  {formatCurrency(account.balance)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Transfer;
