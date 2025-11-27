/**
 * Login Page
 *
 * SECURITY FEATURES:
 * - Input sanitization
 * - Rate limiting (handled by backend)
 * - Secure JWT storage
 * - Auto-redirect on successful login
 * - Session expiry handling
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeText } from '../utils/sanitize';
import { isValidEmail } from '../utils/validators';
import ErrorMessage from '../components/common/ErrorMessage';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { LockClosedIcon, EnvelopeIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated } = useAuth();

  // Check for session messages
  useEffect(() => {
    const session = searchParams.get('session');
    if (session === 'expired') {
      setSessionMessage('Your session has expired. Please login again.');
    } else if (session === 'unauthorized') {
      setSessionMessage('Please login to continue.');
    }
  }, [searchParams]);

  // Redirect if already authenticated (only on initial load, not during login)
  useEffect(() => {
    if (isAuthenticated && !loading) {
      // User is already logged in, redirect to appropriate dashboard
      navigate('/customer', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSessionMessage('');

    // Sanitize inputs (XSS protection)
    const sanitizedEmail = sanitizeText(email).trim();
    const sanitizedPassword = password; // Don't sanitize password (preserve special chars)

    // Validation
    if (!sanitizedEmail || !sanitizedPassword) {
      setError('Please enter both email and password');
      return;
    }

    if (!isValidEmail(sanitizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await login(sanitizedEmail, sanitizedPassword);

      if (result.success) {
        // Redirect based on user role
        const user = result.user;
        const from = location.state?.from?.pathname;

        // Check if 'from' path is appropriate for user's role
        const isAdmin = user.roles?.includes('admin');
        const isSupport = user.roles?.includes('support_agent');
        const isAuditor = user.roles?.includes('auditor');
        const isCustomer = user.roles?.includes('customer');

        // Only use 'from' if it matches the user's role
        const canAccessFrom = from && (
          (isAdmin && from.startsWith('/admin')) ||
          (isSupport && from.startsWith('/support')) ||
          (isAuditor && from.startsWith('/auditor')) ||
          (isCustomer && from.startsWith('/customer'))
        );

        if (canAccessFrom) {
          navigate(from, { replace: true });
        } else if (isAdmin) {
          navigate('/admin', { replace: true });
        } else if (isSupport) {
          navigate('/support', { replace: true });
        } else if (isAuditor) {
          navigate('/auditor', { replace: true });
        } else {
          navigate('/customer', { replace: true });
        }
      } else if (result.requiresPasswordChange) {
        // Redirect to force password change page
        navigate('/force-password-change', {
          replace: true,
          state: { email: result.email, currentPassword: sanitizedPassword }
        });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <div className="flex justify-center">
            <ShieldCheckIcon className="h-16 w-16 text-primary-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to SafeBank
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Secure online banking for your peace of mind
          </p>
        </div>

        {/* Session Messages */}
        {sessionMessage && (
          <div className="rounded-md bg-yellow-50 p-4 border border-yellow-200">
            <p className="text-sm text-yellow-800">{sessionMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="rounded-md shadow-sm space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input-field pl-10"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  maxLength={120}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockClosedIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input-field pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  maxLength={128}
                />
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
            <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
            <span>
              Your connection is secured with RS256 encryption and rate limiting protection.
            </span>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex justify-center items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LockClosedIcon className="h-5 w-5 mr-2" />
                  Sign in
                </>
              )}
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
              >
                Register here
              </Link>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            This is a secure banking application for educational purposes.
            <br />
            All transactions are protected with industry-standard security.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
