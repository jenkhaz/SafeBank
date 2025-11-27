/**
 * Forbidden (403) Page
 * Displayed when user doesn't have permission to access a resource
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

const Forbidden = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleGoToDashboard = () => {
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    // Navigate to appropriate dashboard based on role
    if (user.roles?.includes('admin')) {
      navigate('/admin');
    } else if (user.roles?.includes('support_agent')) {
      navigate('/support');
    } else if (user.roles?.includes('auditor')) {
      navigate('/auditor');
    } else {
      navigate('/customer');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <ShieldExclamationIcon className="mx-auto h-24 w-24 text-red-500" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          403 - Access Denied
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600">
          You don't have permission to access this resource.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <button onClick={handleGoToDashboard} className="btn-primary">
            Go to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-gray-900 hover:text-gray-700"
          >
            Logout <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Forbidden;
