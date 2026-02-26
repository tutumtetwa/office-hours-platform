import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../hooks/useData';
import { appointmentsAPI } from '../utils/api';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  User,
  XCircle,
  CheckCircle,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import { 
  PageHeader, 
  Card, 
  Spinner, 
  Modal, 
  StatusBadge,
  EmptyState,
  Alert,
  FormTextarea,
  ConfirmDialog
} from '../components/UI';
import { formatDate, formatTimeRange, getRelativeDateLabel } from '../utils/dateUtils';

const MyAppointments = () => {
  const { isInstructor } = useAuth();
  const { appointments, loading, refetch } = useAppointments({ upcoming_only: 'true' });
  
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [completeModal, setCompleteModal] = useState(false);
  const [completeStatus, setCompleteStatus] = useState('completed');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleViewDetails = (apt) => {
    setSelectedAppointment(apt);
    setDetailsModal(true);
  };

  const handleCancelClick = (apt) => {
    setSelectedAppointment(apt);
    setCancelReason('');
    setCancelModal(true);
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setError('');

    try {
      await appointmentsAPI.cancelAppointment(selectedAppointment.id, cancelReason);
      setSuccess('Appointment cancelled successfully');
      setCancelModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteClick = (apt) => {
    setSelectedAppointment(apt);
    setCompleteStatus('completed');
    setCompleteModal(true);
  };

  const handleComplete = async () => {
    setActionLoading(true);
    setError('');

    try {
      await appointmentsAPI.completeAppointment(selectedAppointment.id, completeStatus);
      setSuccess(`Appointment marked as ${completeStatus}`);
      setCompleteModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update appointment');
    } finally {
      setActionLoading(false);
    }
  };

  // Group appointments by date
  const groupedAppointments = appointments.reduce((acc, apt) => {
    const date = apt.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(apt);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedAppointments).sort();

  return (
    <>
      <PageHeader 
        title="My Appointments"
        subtitle="View and manage your upcoming appointments"
      />
      
      <div className="page-content">
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <Spinner />
            </div>
          ) : appointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming appointments"
              description={isInstructor 
                ? "You don't have any scheduled appointments yet."
                : "Book an appointment with an instructor to get started."
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
              {sortedDates.map(date => (
                <div key={date}>
                  <h3 style={{ 
                    marginBottom: 'var(--space-md)',
                    paddingBottom: 'var(--space-sm)',
                    borderBottom: '2px solid var(--color-primary)',
                    color: 'var(--color-primary-dark)'
                  }}>
                    {getRelativeDateLabel(date)}
                  </h3>

                  <div className="slots-grid">
                    {groupedAppointments[date].map(apt => (
                      <div 
                        key={apt.id} 
                        className={`slot-card ${apt.is_mine ? 'my-booking' : ''}`}
                      >
                        <div>
                          <div className="slot-time">
                            {formatTimeRange(apt.start_time, apt.end_time)}
                          </div>
                          <StatusBadge status={apt.status} />
                        </div>
                        
                        <div className="slot-info">
                          <div className="slot-instructor">
                            {isInstructor ? (
                              <>{apt.student.first_name} {apt.student.last_name}</>
                            ) : (
                              <>{apt.instructor.first_name} {apt.instructor.last_name}</>
                            )}
                          </div>
                          <div className="slot-details">
                            {apt.meeting_type === 'virtual' ? (
                              <span><Video size={14} /> Virtual</span>
                            ) : (
                              <span><MapPin size={14} /> {apt.location || 'In-person'}</span>
                            )}
                            {apt.topic && <span>• {apt.topic}</span>}
                          </div>
                        </div>

                        <div className="slot-actions">
                          <button 
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleViewDetails(apt)}
                          >
                            Details
                          </button>
                          
                          {isInstructor && apt.status === 'scheduled' && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCompleteClick(apt)}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          
                          {apt.status === 'scheduled' && (
                            <button 
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleCancelClick(apt)}
                              style={{ color: 'var(--color-error)' }}
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Details Modal */}
      <Modal
        isOpen={detailsModal}
        onClose={() => setDetailsModal(false)}
        title="Appointment Details"
        size="md"
      >
        {selectedAppointment && (
          <div>
            <div style={{ 
              padding: 'var(--space-lg)', 
              background: 'var(--color-bg)', 
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <strong style={{ fontSize: '1.125rem' }}>
                  {formatDate(selectedAppointment.date, 'EEEE, MMMM d, yyyy')}
                </strong>
                <StatusBadge status={selectedAppointment.status} />
              </div>
              
              <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <Clock size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span>{formatTimeRange(selectedAppointment.start_time, selectedAppointment.end_time)}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <User size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <span>
                    {isInstructor ? (
                      <>
                        <strong>Student:</strong> {selectedAppointment.student.first_name} {selectedAppointment.student.last_name}
                        <br />
                        <span className="text-sm text-secondary">{selectedAppointment.student.email}</span>
                      </>
                    ) : (
                      <>
                        <strong>Instructor:</strong> {selectedAppointment.instructor.first_name} {selectedAppointment.instructor.last_name}
                        <br />
                        <span className="text-sm text-secondary">{selectedAppointment.instructor.department}</span>
                      </>
                    )}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  {selectedAppointment.meeting_type === 'virtual' ? (
                    <>
                      <Video size={18} style={{ color: 'var(--color-text-muted)' }} />
                      <span>Virtual Meeting</span>
                      {selectedAppointment.meeting_link && (
                        <a 
                          href={selectedAppointment.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-primary"
                        >
                          Join <ExternalLink size={14} />
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <MapPin size={18} style={{ color: 'var(--color-text-muted)' }} />
                      <span>{selectedAppointment.location || 'Location TBD'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {selectedAppointment.topic && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>Topic</strong>
                <p className="text-secondary">{selectedAppointment.topic}</p>
              </div>
            )}

            {selectedAppointment.notes && (
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>Notes</strong>
                <p className="text-secondary">{selectedAppointment.notes}</p>
              </div>
            )}

            {selectedAppointment.status === 'cancelled' && (
              <Alert type="error" title="Cancelled">
                {selectedAppointment.cancellation_reason || 'No reason provided'}
              </Alert>
            )}

            <div className="text-sm text-muted" style={{ marginTop: 'var(--space-lg)' }}>
              Booked on {formatDate(selectedAppointment.created_at, 'MMM d, yyyy h:mm a')}
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Cancel Appointment"
        footer={
          <>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCancelModal(false)}
              disabled={actionLoading}
            >
              Keep Appointment
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? <Spinner size={18} /> : 'Cancel Appointment'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 'var(--space-lg)' }}>
          Are you sure you want to cancel this appointment?
        </p>
        
        {selectedAppointment && (
          <div style={{ 
            padding: 'var(--space-md)', 
            background: 'var(--color-bg)', 
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)'
          }}>
            <div><strong>{formatDate(selectedAppointment.date, 'EEEE, MMMM d')}</strong></div>
            <div>{formatTimeRange(selectedAppointment.start_time, selectedAppointment.end_time)}</div>
            <div className="text-secondary">
              {isInstructor 
                ? `with ${selectedAppointment.student.first_name} ${selectedAppointment.student.last_name}`
                : `with ${selectedAppointment.instructor.first_name} ${selectedAppointment.instructor.last_name}`
              }
            </div>
          </div>
        )}

        <FormTextarea
          label="Reason for cancellation (optional)"
          placeholder="Let them know why you're cancelling..."
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          rows={3}
        />
      </Modal>

      {/* Complete Modal (Instructor only) */}
      <Modal
        isOpen={completeModal}
        onClose={() => setCompleteModal(false)}
        title="Mark Appointment Status"
        footer={
          <>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCompleteModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
            <button 
              className={`btn ${completeStatus === 'completed' ? 'btn-primary' : 'btn-warning'}`}
              onClick={handleComplete}
              disabled={actionLoading}
            >
              {actionLoading ? <Spinner size={18} /> : `Mark as ${completeStatus}`}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 'var(--space-lg)' }}>
          How would you like to mark this appointment?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: completeStatus === 'completed' ? 'var(--color-success-bg)' : 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            border: completeStatus === 'completed' ? '2px solid var(--color-success)' : '2px solid transparent'
          }}>
            <input 
              type="radio" 
              name="status" 
              value="completed"
              checked={completeStatus === 'completed'}
              onChange={(e) => setCompleteStatus(e.target.value)}
            />
            <CheckCircle size={20} style={{ color: 'var(--color-success)' }} />
            <div>
              <strong>Completed</strong>
              <div className="text-sm text-secondary">The meeting took place as scheduled</div>
            </div>
          </label>

          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-md)',
            padding: 'var(--space-md)',
            background: completeStatus === 'no-show' ? 'var(--color-warning-bg)' : 'var(--color-bg)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            border: completeStatus === 'no-show' ? '2px solid var(--color-warning)' : '2px solid transparent'
          }}>
            <input 
              type="radio" 
              name="status" 
              value="no-show"
              checked={completeStatus === 'no-show'}
              onChange={(e) => setCompleteStatus(e.target.value)}
            />
            <XCircle size={20} style={{ color: 'var(--color-warning)' }} />
            <div>
              <strong>No-Show</strong>
              <div className="text-sm text-secondary">The student did not attend</div>
            </div>
          </label>
        </div>
      </Modal>
    </>
  );
};

export default MyAppointments;
