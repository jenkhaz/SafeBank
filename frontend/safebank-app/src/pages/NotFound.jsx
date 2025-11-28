/**
 * Not Found (404) Page
 */

import { Link } from 'react-router-dom';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <QuestionMarkCircleIcon className="mx-auto h-24 w-24 text-gray-400" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          404 - Page Not Found
        </h1>
        <p className="mt-6 text-base leading-7 text-gray-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link to="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
          <Link to="/login" className="text-sm font-semibold text-gray-900">
            Login <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
