/**
 * Customer Dashboard
 * Shows account overview with balances and recent transactions
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/validators';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import {
  BanknotesIcon,
  ArrowPathIcon,
  PlusIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';

const CustomerDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch all accounts
        const accountsResponse = await api.accounts.getMyAccounts();
        const accountsData = accountsResponse.data;
        setAccounts(accountsData);

        // Fetch recent 5 transactions for each account
        const transactionsPromises = accountsData.map(async (account) => {
          try {
            const txResponse = await api.transactions.getRecentTransactions(account.id);
            return { accountId: account.id, transactions: txResponse.data };
          } catch (err) {
            return { accountId: account.id, transactions: [] };
          }
        });

        const transactionsResults = await Promise.all(transactionsPromises);
        const transactionsMap = {};
        transactionsResults.forEach((result) => {
          transactionsMap[result.accountId] = result.transactions;
        });
        setRecentTransactions(transactionsMap);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getTotalBalance = () => {
    return accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading your dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's an overview of your accounts.
          </p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link
            to="/customer/accounts"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <BanknotesIcon className="h-10 w-10 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getTotalBalance())}
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/customer/transfer"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <ArrowPathIcon className="h-10 w-10 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Transfer</p>
                <p className="text-lg font-semibold text-gray-900">Send Money</p>
              </div>
            </div>
          </Link>

          <Link
            to="/customer/accounts"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <PlusIcon className="h-10 w-10 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">New Account</p>
                <p className="text-lg font-semibold text-gray-900">Open Account</p>
              </div>
            </div>
          </Link>

          <Link
            to="/customer/tickets"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <TicketIcon className="h-10 w-10 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Support</p>
                <p className="text-lg font-semibold text-gray-900">Get Help</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Accounts List */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">My Accounts</h3>
          {accounts.length === 0 ? (
            <div className="card text-center py-8">
              <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No accounts</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new account.
              </p>
              <div className="mt-6">
                <Link to="/customer/accounts" className="btn-primary">
                  <PlusIcon className="h-5 w-5 mr-2 inline" />
                  Create Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {accounts.map((account) => (
                <div key={account.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 capitalize">
                        {account.type} Account
                      </h4>
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

                  <div className="mb-4">
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>

                  {/* Recent Transactions */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Recent Transactions
                    </p>
                    {recentTransactions[account.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {recentTransactions[account.id].slice(0, 5).map((tx) => (
                          <div
                            key={tx.id}
                            className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0"
                          >
                            <div>
                              <p className="font-medium text-gray-900 capitalize">
                                {tx.type}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(tx.timestamp)}
                              </p>
                            </div>
                            <span
                              className={`font-semibold ${
                                tx.type === 'deposit' || tx.type === 'topup' || tx.receiver_account_id === account.id && tx.sender_account_id !== account.id
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {tx.type === 'deposit' || tx.type === 'topup' || (tx.receiver_account_id === account.id && tx.sender_account_id !== account.id) ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No recent transactions</p>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Link
                      to="/customer/transfer"
                      state={{ selectedAccount: account }}
                      className="btn-primary flex-1 text-center text-sm"
                    >
                      Transfer
                    </Link>
                    <Link
                      to="/customer/transactions"
                      state={{ selectedAccount: account }}
                      className="btn-secondary flex-1 text-center text-sm"
                    >
                      View All
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
