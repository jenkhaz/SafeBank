/**
 * Security Events Page
 * Monitor and investigate security events and threats
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatDate } from '../../utils/validators';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import {
  ShieldExclamationIcon,
  FunnelIcon,
  XMarkIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const SecurityEvents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [investigateModalOpen, setInvestigateModalOpen] = useState(false);
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const eventsPerPage = 20;

  // Filters
  const [filters, setFilters] = useState({
    severity: searchParams.get('severity') || '',
    event_type: '',
    investigated: '',
    user_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    // Check if there's an ID in the URL to show specific event
    const eventId = searchParams.get('id');
    if (eventId) {
      fetchEventDetails(eventId);
    }
    fetchSecurityEvents();
  }, [currentPage, filters]);

  const fetchSecurityEvents = async () => {
    setLoading(true);
    try {
      const params = {
        limit: eventsPerPage,
        offset: (currentPage - 1) * eventsPerPage,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        ),
      };

      const response = await api.audit.getSecurityEvents(params);
      setEvents(response.data.events || []);
      setTotalEvents(response.data.total || 0);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load security events');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      const response = await api.audit.getSecurityEvent(eventId);
      setSelectedEvent(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load event details');
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ ...filters, [field]: value });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      severity: '',
      event_type: '',
      investigated: '',
      user_id: '',
      start_date: '',
      end_date: '',
    });
    setSearchParams({});
    setCurrentPage(1);
  };

  const handleInvestigate = async () => {
    if (!selectedEvent) return;

    setSubmitting(true);
    try {
      await api.audit.investigateEvent(selectedEvent.id, {
        notes: investigationNotes,
      });

      setSuccess('Security event marked as investigated');
      setInvestigateModalOpen(false);
      setInvestigationNotes('');

      // Refresh events list
      await fetchSecurityEvents();

      // Update selected event
      const response = await api.audit.getSecurityEvent(selectedEvent.id);
      setSelectedEvent(response.data);
    } catch (err) {
      setError(err.message || 'Failed to mark event as investigated');
    } finally {
      setSubmitting(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    const baseClass = "h-5 w-5";
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return <ShieldExclamationIcon className={`${baseClass} text-red-600`} />;
      case 'medium':
        return <ShieldExclamationIcon className={`${baseClass} text-yellow-600`} />;
      default:
        return <ShieldExclamationIcon className={`${baseClass} text-blue-600`} />;
    }
  };

  const totalPages = Math.ceil(totalEvents / eventsPerPage);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Security Events</h2>
            <p className="mt-1 text-sm text-gray-500">
              Monitor and investigate security threats and anomalies
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Filters */}
        {showFilters && (
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="input-field"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type
                </label>
                <input
                  type="text"
                  value={filters.event_type}
                  onChange={(e) => handleFilterChange('event_type', e.target.value)}
                  className="input-field"
                  placeholder="e.g., failed_login, suspicious_transaction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Investigation Status
                </label>
                <select
                  value={filters.investigated}
                  onChange={(e) => handleFilterChange('investigated', e.target.value)}
                  className="input-field"
                >
                  <option value="">All</option>
                  <option value="true">Investigated</option>
                  <option value="false">Not Investigated</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User ID
                </label>
                <input
                  type="number"
                  value={filters.user_id}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                  className="input-field"
                  placeholder="Enter user ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-700">
            Showing {events.length > 0 ? (currentPage - 1) * eventsPerPage + 1 : 0} to{' '}
            {Math.min(currentPage * eventsPerPage, totalEvents)} of {totalEvents} events
          </p>
        </div>

        {/* Security Events List */}
        <div className="card">
          {loading ? (
            <LoadingSpinner message="Loading security events..." />
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <ShieldExclamationIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No security events found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(event.severity)} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => {
                    setSelectedEvent(event);
                    setSearchParams({ id: event.id });
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-1">{getSeverityIcon(event.severity)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold uppercase">
                            {event.severity}
                          </span>
                          <span className="text-xs">•</span>
                          <span className="text-xs">{event.event_type}</span>
                          {event.user_id && (
                            <>
                              <span className="text-xs">•</span>
                              <span className="text-xs">User ID: {event.user_id}</span>
                            </>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium">{event.description}</p>
                        {event.details && (
                          <p className="mt-1 text-xs">
                            {typeof event.details === 'object'
                              ? JSON.stringify(event.details)
                              : event.details}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs">{formatDate(event.created_at)}</p>
                      {event.investigated ? (
                        <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Investigated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}

        {/* Event Detail Modal */}
        {selectedEvent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Security Event Details</h3>
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setSearchParams({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Event ID</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Timestamp</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedEvent.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Severity</p>
                    <p className="mt-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium uppercase ${getSeverityColor(selectedEvent.severity)}`}>
                        {selectedEvent.severity}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Event Type</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedEvent.event_type}</p>
                  </div>
                  {selectedEvent.user_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">User ID</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedEvent.user_id}</p>
                    </div>
                  )}
                  {selectedEvent.ip_address && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">IP Address</p>
                      <p className="mt-1 text-sm text-gray-900">{selectedEvent.ip_address}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-500">Investigation Status</p>
                    <p className="mt-1">
                      {selectedEvent.investigated ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Investigated
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Pending Investigation
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Description</p>
                  <p className="text-sm text-gray-900">{selectedEvent.description}</p>
                </div>

                {selectedEvent.details && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Additional Details</p>
                    <pre className="bg-gray-50 rounded-md p-4 text-xs text-gray-900 overflow-auto max-h-64">
                      {JSON.stringify(selectedEvent.details, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedEvent.investigated && selectedEvent.investigation_notes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Investigation Notes</p>
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <p className="text-sm text-gray-900">{selectedEvent.investigation_notes}</p>
                      {selectedEvent.investigated_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Investigated on {formatDate(selectedEvent.investigated_at)}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {!selectedEvent.investigated && (
                  <button
                    onClick={() => setInvestigateModalOpen(true)}
                    className="btn-primary"
                  >
                    Mark as Investigated
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setSearchParams({});
                  }}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Investigation Modal */}
        {investigateModalOpen && selectedEvent && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Mark as Investigated</h3>
                <button
                  onClick={() => {
                    setInvestigateModalOpen(false);
                    setInvestigationNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">
                    Add notes about your investigation of this security event.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investigation Notes
                  </label>
                  <textarea
                    value={investigationNotes}
                    onChange={(e) => setInvestigationNotes(e.target.value)}
                    className="input-field"
                    rows={5}
                    placeholder="Enter your findings and conclusions..."
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setInvestigateModalOpen(false);
                      setInvestigationNotes('');
                    }}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvestigate}
                    className="btn-primary flex-1"
                    disabled={submitting || !investigationNotes.trim()}
                  >
                    {submitting ? 'Saving...' : 'Mark as Investigated'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SecurityEvents;
