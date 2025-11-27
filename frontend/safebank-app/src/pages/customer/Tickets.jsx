/**
 * Customer Support Tickets Page
 * Create and view support tickets
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import api from '../../utils/api';
import { formatDate } from '../../utils/validators';
import { sanitizeText } from '../../utils/sanitize';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import SuccessMessage from '../../components/common/SuccessMessage';
import {
  PlusIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create ticket modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'Medium',
  });

  // View ticket modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketNotes, setTicketNotes] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await api.support.getMyTickets(params);
      setTickets(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const sanitizedSubject = sanitizeText(newTicket.subject).trim();
    const sanitizedDescription = sanitizeText(newTicket.description).trim();

    if (!sanitizedSubject || !sanitizedDescription) {
      setError('Subject and description are required');
      return;
    }

    if (sanitizedSubject.length < 5) {
      setError('Subject must be at least 5 characters');
      return;
    }

    if (sanitizedDescription.length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    setCreateLoading(true);
    try {
      await api.support.createTicket({
        subject: sanitizedSubject,
        description: sanitizedDescription,
        priority: newTicket.priority,
      });

      setSuccess('Support ticket created successfully!');
      setShowCreateModal(false);
      setNewTicket({ subject: '', description: '', priority: 'Medium' });
      await fetchTickets();
    } catch (err) {
      setError(err.message || 'Failed to create ticket');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowViewModal(true);
    setViewLoading(true);
    setError('');

    try {
      const response = await api.support.getTicket(ticket.id);
      setSelectedTicket(response.data.ticket);
      setTicketNotes(response.data.notes || []);
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setViewLoading(false);
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
      const response = await api.support.addNote(selectedTicket.id, {
        message: sanitizedNote,
      });

      setTicketNotes([...ticketNotes, response.data]);
      setNewNote('');
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
            <h2 className="text-2xl font-bold text-gray-900">Support Tickets</h2>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage your support tickets
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Ticket
          </button>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}
        {success && <SuccessMessage message={success} onDismiss={() => setSuccess('')} />}

        {/* Filter */}
        <div className="card">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-48"
            >
              <option value="">All Tickets</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            {statusFilter && (
              <button
                onClick={() => setStatusFilter('')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>

        {/* Tickets List */}
        {tickets.length === 0 ? (
          <div className="card text-center py-12">
            <TicketIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {statusFilter ? 'No tickets found' : 'No support tickets yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {statusFilter
                ? 'Try changing the filter to see more tickets.'
                : 'Create a support ticket to get help from our team.'}
            </p>
            {!statusFilter && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2 inline" />
                Create Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ticket.subject}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Ticket #{ticket.id} • Created {formatDate(ticket.created_at)}
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

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Priority:</span>
                    <span
                      className={`text-xs font-semibold ${getPriorityColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => handleViewTicket(ticket)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                    View Details
                  </button>
                </div>

                {ticket.updated_at !== ticket.created_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Last updated: {formatDate(ticket.updated_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Ticket Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Support Ticket</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={newTicket.subject}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, subject: e.target.value })
                    }
                    className="input-field"
                    placeholder="Brief description of your issue"
                    maxLength={200}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, description: e.target.value })
                    }
                    className="input-field"
                    rows={6}
                    placeholder="Provide detailed information about your issue..."
                    maxLength={2000}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {newTicket.description.length}/2000 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) =>
                      setNewTicket({ ...newTicket, priority: e.target.value })
                    }
                    className="input-field"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Select urgency level for your issue
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
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
                    {createLoading ? 'Creating...' : 'Create Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Ticket Modal */}
        {showViewModal && selectedTicket && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white mb-10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Ticket #{selectedTicket.id} • Created{' '}
                    {formatDate(selectedTicket.created_at)}
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
              </div>

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
                            note.author_role === 'support_agent'
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-50 border border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-gray-700">
                              {note.author_role === 'support_agent'
                                ? 'Support Agent'
                                : 'You'}
                            </span>
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
                {selectedTicket.status !== 'Closed' && (
                  <form onSubmit={handleAddNote} className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add a Reply
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
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">
                        {newNote.length}/1000 characters
                      </p>
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={addingNote || !newNote.trim()}
                      >
                        {addingNote ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </form>
                )}

                {selectedTicket.status === 'Closed' && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      This ticket is closed and cannot accept new replies.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tickets;
