/**
 * Support Agent Ticket Management Page
 * View and manage all support tickets
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatDate } from '../../utils/validators';
import { sanitizeText } from '../../utils/sanitize';
import { getUserId } from '../../utils/auth';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import {
  TicketIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  FunnelIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

const TicketManagement = () => {
  const currentUserId = getUserId();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // View ticket modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketNotes, setTicketNotes] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);

  // Add note
  const [newNote, setNewNote] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Update status
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assign ticket
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, assignedToMe]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assignedToMe) params.assigned_to_me = true;

      const response = await api.support.getAllTickets(params);
      setTickets(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowViewModal(true);
    setViewLoading(true);
    setError('');

    try {
      const response = await api.support.getTicketDetails(ticket.id);
      setSelectedTicket(response.data.ticket);
      setTicketNotes(response.data.notes || []);
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setViewLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setError('');
    setUpdatingStatus(true);

    try {
      const response = await api.support.updateTicketStatus(selectedTicket.id, {
        status: newStatus,
      });

      setSelectedTicket(response.data);
      setSuccess(`Ticket status updated to ${newStatus}`);

      // Update in tickets list
      setTickets(
        tickets.map((t) => (t.id === selectedTicket.id ? response.data : t))
      );
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAssignToMe = async () => {
    setError('');
    setAssigning(true);

    try {
      const response = await api.support.assignTicket(selectedTicket.id, {
        assign_to: currentUserId,
      });

      setSelectedTicket(response.data);
      setSuccess('Ticket assigned to you');

      // Update in tickets list
      setTickets(
        tickets.map((t) => (t.id === selectedTicket.id ? response.data : t))
      );
    } catch (err) {
      setError(err.message || 'Failed to assign ticket');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    setError('');
    setAssigning(true);

    try {
      const response = await api.support.assignTicket(selectedTicket.id, {
        assign_to: null,
      });

      setSelectedTicket(response.data);
      setSuccess('Ticket unassigned');

      // Update in tickets list
      setTickets(
        tickets.map((t) => (t.id === selectedTicket.id ? response.data : t))
      );
    } catch (err) {
      setError(err.message || 'Failed to unassign ticket');
    } finally {
      setAssigning(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    setError('');

    const sanitizedNote = sanitizeText(newNote).trim();

    if (!sanitizedNote) {
      setError('Note cannot be empty');
      return;
    }

    if (sanitizedNote.length < 5) {
      setError('Note must be at least 5 characters');
      return;
    }

    setAddingNote(true);
    try {
      const response = await api.support.addAgentNote(selectedTicket.id, {
        message: sanitizedNote,
        is_internal: isInternalNote,
      });

      setTicketNotes([...ticketNotes, response.data]);
      setNewNote('');
      setIsInternalNote(false);
      setSuccess('Note added successfully');
    } catch (err) {
      setError(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'text-red-600';
      case 'High':
        return 'text-orange-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'Low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setAssignedToMe(false);
  };

  if (loading && tickets.length === 0) {
    return (
      <DashboardLayout>
        <LoadingSpinner message="Loading tickets..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ticket Management</h2>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all customer support tickets
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-primary flex items-center"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Filters */}
        {showFilters && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={assignedToMe}
                    onChange={(e) => setAssignedToMe(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Assigned to me only
                  </span>
                </label>
              </div>
            </div>

            {(statusFilter || priorityFilter || assignedToMe) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <div className="card text-center py-12">
            <TicketIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No tickets found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {statusFilter || priorityFilter || assignedToMe
                ? 'Try changing the filters to see more tickets.'
                : 'No support tickets available at the moment.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticket.subject}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Ticket #{ticket.id} • User ID: {ticket.user_id}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {ticket.description}
                </p>

                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Priority:</span>
                    <span
                      className={`font-semibold ${getPriorityColor(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </span>
                  </div>

                  {ticket.assigned_to && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Assigned to:</span>
                      <span className="text-gray-700">
                        {ticket.assigned_to === currentUserId ? 'You' : `User ${ticket.assigned_to}`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-700">{formatDate(ticket.created_at)}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleViewTicket(ticket)}
                  className="w-full text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                  View & Manage
                </button>
              </div>
            ))}
          </div>
        )}

        {/* View Ticket Modal */}
        {showViewModal && selectedTicket && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Ticket #{selectedTicket.id} • User ID: {selectedTicket.user_id} •
                    Created {formatDate(selectedTicket.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedTicket(null);
                    setTicketNotes([]);
                    setNewNote('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    selectedTicket.status
                  )}`}
                >
                  {selectedTicket.status}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                    selectedTicket.priority
                  )} bg-gray-100`}
                >
                  {selectedTicket.priority} Priority
                </span>
                {selectedTicket.assigned_to && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <UserIcon className="h-3 w-3 inline mr-1" />
                    {selectedTicket.assigned_to === currentUserId
                      ? 'Assigned to you'
                      : `Assigned to User ${selectedTicket.assigned_to}`}
                  </span>
                )}
              </div>

              {/* Ticket Actions */}
              <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Ticket Actions
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateStatus('Open')}
                    disabled={
                      updatingStatus || selectedTicket.status === 'Open'
                    }
                    className="btn-secondary text-xs"
                  >
                    Set Open
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('In Progress')}
                    disabled={
                      updatingStatus || selectedTicket.status === 'In Progress'
                    }
                    className="btn-secondary text-xs"
                  >
                    Set In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Resolved')}
                    disabled={
                      updatingStatus || selectedTicket.status === 'Resolved'
                    }
                    className="btn-secondary text-xs"
                  >
                    Set Resolved
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Closed')}
                    disabled={
                      updatingStatus || selectedTicket.status === 'Closed'
                    }
                    className="btn-secondary text-xs"
                  >
                    Set Closed
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  {selectedTicket.assigned_to === currentUserId ? (
                    <button
                      onClick={handleUnassign}
                      disabled={assigning}
                      className="btn-secondary flex-1 text-xs"
                    >
                      {assigning ? 'Processing...' : 'Unassign from me'}
                    </button>
                  ) : (
                    <button
                      onClick={handleAssignToMe}
                      disabled={assigning}
                      className="btn-primary flex-1 text-xs"
                    >
                      {assigning ? 'Processing...' : 'Assign to me'}
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="border-t pt-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Description:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Conversation */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Conversation ({ticketNotes.length})
                </h4>

                {viewLoading ? (
                  <LoadingSpinner message="Loading conversation..." />
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                    {ticketNotes.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        No replies yet. Add a note to start the conversation.
                      </p>
                    ) : (
                      ticketNotes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-4 rounded-lg ${
                            note.is_internal
                              ? 'bg-purple-50 border border-purple-200'
                              : note.author_role === 'support_agent'
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-xs font-semibold text-gray-700">
                                {note.author_role === 'support_agent'
                                  ? 'Support Agent'
                                  : 'Customer'}
                              </span>
                              {note.is_internal && (
                                <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-purple-200 text-purple-800">
                                  Internal
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(note.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {note.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Agent Note
                  </label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="input-field"
                    rows={3}
                    placeholder="Type your message here..."
                    maxLength={1000}
                    disabled={addingNote}
                  />

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Internal note (not visible to customer)
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">
                        {newNote.length}/1000
                      </p>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={addingNote || !newNote.trim()}
                      >
                        {addingNote ? 'Sending...' : 'Send Note'}
                      </button>
                    </div>
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

export default TicketManagement;
