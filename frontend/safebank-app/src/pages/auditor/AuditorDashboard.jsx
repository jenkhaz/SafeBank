/**
 * Auditor Dashboard Page
 * Main dashboard for auditors with statistics and security alerts
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatDate } from '../../utils/validators';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const AuditorDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [auditStats, setAuditStats] = useState(null);
  const [securityStats, setSecurityStats] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [auditStatsRes, securityStatsRes, alertsRes] = await Promise.all([
          api.audit.getAuditStats(),
          api.audit.getSecurityStats(),
          api.audit.getSecurityAlerts(),
        ]);

        setAuditStats(auditStatsRes.data);
        setSecurityStats(securityStatsRes.data);
        setAlerts(alertsRes.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading auditor dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Auditor Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            System-wide audit logs and security monitoring
          </p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/auditor/audit-logs')}>
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Audit Logs</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {auditStats?.total_logs || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/auditor/security-events')}>
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Security Events</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {securityStats?.total_events || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/auditor/security-events?severity=critical,high')}>
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Alerts</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {alerts.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <ChartBarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Investigated</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {securityStats?.investigated_events || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Security Alerts */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Security Alerts</h3>
            <button
              onClick={() => navigate('/auditor/security-events')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No active security alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => navigate(`/auditor/security-events?id=${alert.id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase">
                          {alert.severity}
                        </span>
                        <span className="text-xs text-gray-600">•</span>
                        <span className="text-xs text-gray-600">{alert.event_type}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium">{alert.description}</p>
                      {alert.details && (
                        <p className="mt-1 text-xs text-gray-600">
                          {typeof alert.details === 'object'
                            ? JSON.stringify(alert.details)
                            : alert.details}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xs text-gray-500">{formatDate(alert.created_at)}</p>
                      {alert.investigated ? (
                        <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
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

        {/* Audit Stats Breakdown */}
        {auditStats?.by_service && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Audit Logs by Service</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(auditStats.by_service).map(([service, count]) => (
                <div key={service} className="border rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-gray-500 capitalize">{service}</p>
                  <p className="text-xl font-semibold text-gray-900 mt-1">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Events by Severity */}
        {securityStats?.by_severity && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Events by Severity</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(securityStats.by_severity).map(([severity, count]) => (
                <div
                  key={severity}
                  className={`border rounded-lg p-4 text-center ${getSeverityColor(severity)}`}
                >
                  <p className="text-sm font-medium capitalize">{severity}</p>
                  <p className="text-xl font-semibold mt-1">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Logs</h3>
            <p className="text-sm text-gray-600 mb-4">
              View comprehensive audit trails of all system activities
            </p>
            <button
              onClick={() => navigate('/auditor/audit-logs')}
              className="btn-primary w-full"
            >
              View Audit Logs
            </button>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Events</h3>
            <p className="text-sm text-gray-600 mb-4">
              Monitor and investigate security events and threats
            </p>
            <button
              onClick={() => navigate('/auditor/security-events')}
              className="btn-primary w-full"
            >
              View Security Events
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditorDashboard;
