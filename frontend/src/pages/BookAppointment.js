import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInstructors, useSlots } from '../hooks/useData';
import { appointmentsAPI } from '../utils/api';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Video, 
  Clock,
  User,
  CheckCircle,
  Search
} from 'lucide-react';
import { 
  PageHeader, 
  Card, 
  Spinner, 
  Modal, 
  FormSelect, 
  FormTextarea,
  EmptyState,
  Alert
} from '../components/UI';
import { 
  formatDate, 
  formatTime, 
  formatTimeRange, 
  getNextDays, 
  formatDateForAPI,
  isSameDayAs 
} from '../utils/dateUtils';

const BookAppointment = () => {
  const navigate = useNavigate();
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    meeting_type: 'in-person',
    topic: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { instructors, loading: loadingInstructors } = useInstructors();
  
  const startDate = formatDateForAPI(weekStart);
  const endDate = formatDateForAPI(new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000));
  
  const { slots, loading: loadingSlots, refetch } = useSlots({
    instructor_id: selectedInstructor || undefined,
    start_date: startDate,
    end_date: endDate,
    available_only: 'true'
  });

  // Get days for the date picker
  const days = useMemo(() => getNextDays(14, weekStart), [weekStart]);

  // Filter slots for selected date
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => isSameDayAs(slot.date, selectedDate));
  }, [slots, selectedDate]);

  // Group slots by instructor
  const slotsByInstructor = useMemo(() => {
    const grouped = {};
    filteredSlots.forEach(slot => {
      const instId = slot.instructor_id;
      if (!grouped[instId]) {
        grouped[instId] = {
          instructor: slot.instructor,
          slots: []
        };
      }
      grouped[instId].slots.push(slot);
    });
    return Object.values(grouped);
  }, [filteredSlots]);

  const handlePrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    if (newStart >= new Date()) {
      setWeekStart(newStart);
    }
  };

  const handleNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setBookingData({
      meeting_type: slot.meeting_type === 'either' ? 'in-person' : slot.meeting_type,
      topic: '',
      notes: ''
    });
    setBookingModal(true);
  };

  const handleBook = async () => {
    setLoading(true);
    setError('');

    try {
      await appointmentsAPI.bookAppointment({
        slot_id: selectedSlot.id,
        meeting_type: bookingData.meeting_type,
        topic: bookingData.topic,
        notes: bookingData.notes
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/my-appointments');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <PageHeader title="Book Appointment" />
        <div className="page-content">
          <Card>
            <div style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
              <CheckCircle size={64} style={{ color: 'var(--color-success)', marginBottom: 'var(--space-lg)' }} />
              <h2 style={{ marginBottom: 'var(--space-md)' }}>Appointment Booked!</h2>
              <p className="text-secondary">Redirecting to your appointments...</p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Book Appointment"
        subtitle="Find an available time slot with an instructor"
      />
      
      <div className="page-content">
        {/* Filters */}
        <Card className="mb-xl">
          <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '250px' }}>
              <FormSelect
                label="Filter by Instructor"
                value={selectedInstructor}
                onChange={(e) => setSelectedInstructor(e.target.value)}
                placeholder="All Instructors"
                options={instructors.map(inst => ({
                  value: inst.id,
                  label: `${inst.first_name} ${inst.last_name} - ${inst.department || 'No Dept'}`
                }))}
              />
            </div>
          </div>
        </Card>

        {/* Date Picker */}
        <Card className="mb-xl">
          <div className="calendar-header">
            <button className="btn btn-ghost" onClick={handlePrevWeek}>
              <ChevronLeft size={20} />
            </button>
            <h3 className="calendar-title">
              {formatDate(weekStart, 'MMMM yyyy')}
            </h3>
            <button className="btn btn-ghost" onClick={handleNextWeek}>
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="date-picker">
            {days.map(day => {
              const isSelected = isSameDayAs(day, selectedDate);
              const daySlots = slots.filter(s => isSameDayAs(s.date, day));
              const hasSlots = daySlots.length > 0;

              return (
                <button
                  key={day.toISOString()}
                  className={`date-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(day)}
                  style={{ 
                    opacity: hasSlots ? 1 : 0.5,
                    position: 'relative'
                  }}
                >
                  <span className="day-name">{formatDate(day, 'EEE')}</span>
                  <span className="day-num">{formatDate(day, 'd')}</span>
                  {hasSlots && (
                    <span style={{
                      position: 'absolute',
                      bottom: '4px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isSelected ? 'white' : 'var(--color-success)'
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Available Slots */}
        <Card title={`Available Slots - ${formatDate(selectedDate, 'EEEE, MMMM d')}`}>
          {loadingSlots ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <Spinner />
            </div>
          ) : slotsByInstructor.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No available slots"
              description="No office hours available on this date. Try selecting a different date or instructor."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
              {slotsByInstructor.map(({ instructor, slots: instSlots }) => (
                <div key={instructor.id}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-md)',
                    marginBottom: 'var(--space-md)',
                    paddingBottom: 'var(--space-sm)',
                    borderBottom: '1px solid var(--color-bg)'
                  }}>
                    <User size={20} style={{ color: 'var(--color-primary)' }} />
                    <div>
                      <strong>{instructor.first_name} {instructor.last_name}</strong>
                      <span className="text-secondary text-sm" style={{ marginLeft: 'var(--space-sm)' }}>
                        {instructor.department}
                      </span>
                    </div>
                  </div>

                  <div className="slots-grid">
                    {instSlots.map(slot => (
                      <div 
                        key={slot.id} 
                        className="slot-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSlotClick(slot)}
                      >
                        <div>
                          <div className="slot-time">
                            {formatTimeRange(slot.start_time, slot.end_time)}
                          </div>
                        </div>
                        <div className="slot-details" style={{ flex: 1 }}>
                          {slot.location && (
                            <span><MapPin size={14} /> {slot.location}</span>
                          )}
                          <span>
                            {slot.meeting_type === 'either' ? (
                              <><Video size={14} /> In-person or Virtual</>
                            ) : slot.meeting_type === 'virtual' ? (
                              <><Video size={14} /> Virtual only</>
                            ) : (
                              <><MapPin size={14} /> In-person only</>
                            )}
                          </span>
                        </div>
                        <button className="btn btn-primary btn-sm">
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={bookingModal}
        onClose={() => setBookingModal(false)}
        title="Confirm Booking"
        footer={
          <>
            <button 
              className="btn btn-secondary" 
              onClick={() => setBookingModal(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleBook}
              disabled={loading}
            >
              {loading ? <Spinner size={18} /> : 'Confirm Booking'}
            </button>
          </>
        }
      >
        {error && <Alert type="error">{error}</Alert>}

        {selectedSlot && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ 
              padding: 'var(--space-lg)', 
              background: 'var(--color-bg)', 
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
                <strong>{formatDate(selectedSlot.date, 'EEEE, MMMM d, yyyy')}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <Clock size={20} style={{ color: 'var(--color-primary)' }} />
                <span>{formatTimeRange(selectedSlot.start_time, selectedSlot.end_time)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <User size={20} style={{ color: 'var(--color-primary)' }} />
                <span>{selectedSlot.instructor.first_name} {selectedSlot.instructor.last_name}</span>
              </div>
            </div>

            {selectedSlot.meeting_type === 'either' && (
              <FormSelect
                label="Meeting Type"
                value={bookingData.meeting_type}
                onChange={(e) => setBookingData({ ...bookingData, meeting_type: e.target.value })}
                options={[
                  { value: 'in-person', label: 'In-Person' },
                  { value: 'virtual', label: 'Virtual' }
                ]}
              />
            )}

            <FormTextarea
              label="Topic (Optional)"
              placeholder="What would you like to discuss?"
              value={bookingData.topic}
              onChange={(e) => setBookingData({ ...bookingData, topic: e.target.value })}
              rows={2}
            />

            <FormTextarea
              label="Additional Notes (Optional)"
              placeholder="Any additional information for the instructor..."
              value={bookingData.notes}
              onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
              rows={2}
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default BookAppointment;
