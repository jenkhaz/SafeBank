/**
 * Register Page
 *
 * SECURITY FEATURES:
 * - Strong password validation
 * - Input sanitization
 * - Email format validation
 * - Rate limiting (backend: 5 per hour)
 * - XSS protection
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeText } from '../utils/sanitize';
import {
  isValidEmail,
  validatePassword,
  isValidPhone,
  isValidName,
  containsSuspiciousPatterns,
} from '../utils/validators';
import ErrorMessage from '../components/common/ErrorMessage';
import { ShieldCheckIcon, UserPlusIcon } from '@heroicons/react/24/solid';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear field error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Sanitize and validate full name
    const sanitizedName = sanitizeText(formData.full_name).trim();
    if (!sanitizedName) {
      newErrors.full_name = 'Full name is required';
    } else if (!isValidName(sanitizedName)) {
      newErrors.full_name = 'Please enter a valid name (letters, spaces, hyphens only)';
    } else if (containsSuspiciousPatterns(sanitizedName)) {
      newErrors.full_name = 'Invalid characters detected';
    }

    // Sanitize and validate email
    const sanitizedEmail = sanitizeText(formData.email).trim();
    if (!sanitizedEmail) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(sanitizedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate phone
    const sanitizedPhone = sanitizeText(formData.phone).trim();
    if (!sanitizedPhone) {
      newErrors.phone = 'Phone number is required';
    } else if (!isValidPhone(sanitizedPhone)) {
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }

    // Validate password
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.errors.join('. ');
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Sanitize data before sending
      const registrationData = {
        full_name: sanitizeText(formData.full_name).trim(),
        email: sanitizeText(formData.email).trim().toLowerCase(),
        phone: sanitizeText(formData.phone).replace(/[\s\-\(\)\.]/g, ''), // Remove formatting
        password: formData.password, // Don't sanitize password
      };

      const result = await register(registrationData);

      if (result.success) {
        // Redirect to dashboard after successful registration and auto-login
        navigate('/dashboard', { replace: true });
      } else {
        setGeneralError(result.error || 'Registration failed');
      }
    } catch (err) {
      setGeneralError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
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
            Create your SafeBank account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join our secure banking platform
          </p>
        </div>

        {/* General Error */}
        {generalError && <ErrorMessage message={generalError} onDismiss={() => setGeneralError('')} />}

        {/* Registration Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                autoComplete="name"
                required
                className={`input-field ${errors.full_name ? 'border-red-500' : ''}`}
                placeholder="John Doe"
                value={formData.full_name}
                onChange={handleChange}
                disabled={loading}
                maxLength={100}
              />
              {errors.full_name && <p className="error-text">{errors.full_name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                maxLength={120}
              />
              {errors.email && <p className="error-text">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                maxLength={20}
              />
              {errors.phone && <p className="error-text">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                maxLength={128}
              />
              {errors.password && <p className="error-text">{errors.password}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Must be 8+ characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
                maxLength={128}
              />
              {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 p-4 rounded-md text-sm text-gray-700">
            <p className="font-medium mb-2">Security Features:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>RS256 JWT encryption</li>
              <li>Strong password requirements</li>
              <li>XSS protection on all inputs</li>
              <li>Rate limiting: 5 registrations per hour</li>
            </ul>
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
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Create Account
                </>
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500 focus:outline-none focus:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
