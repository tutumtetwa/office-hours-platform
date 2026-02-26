import React, { useState, useMemo } from 'react';
import { useMySlots } from '../hooks/useData';
import { slotsAPI } from '../utils/api';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Trash2,
  Edit2,
  User,
  Clock
} from 'lucide-react';
import { 
  PageHeader, 
  Card, 
  Spinner, 
  Modal, 
  FormInput,
  FormSelect,
  FormTextarea,
  EmptyState,
  Alert,
  Badge
} from '../components/UI';
import { 
  formatDate, 
  formatTimeRange, 
  getNextDays, 
  formatDateForAPI,
  isSameDayAs 
} from '../utils/dateUtils';

const AvailabilityManagement = () => {
  const [weekStart, setWeekStart] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    date: formatDateForAPI(new Date()),
    start_time: '09:00',
    end_time: '09:30',
    location: '',
    meeting_type: 'either',
    notes: ''
  });

  const startDate = formatDateForAPI(weekStart);
  const endDate = formatDateForAPI(new Date(weekStart.getTime() + 13 * 24 * 60 * 60 * 1000));
  
  const { slots, loading: loadingSlots, refetch } = useMySlots({
    start_date: startDate,
    end_date: endDate
  });

  const days = useMemo(() => getNextDays(14, weekStart), [weekStart]);

  const filteredSlots = useMemo(() => {
    return slots.filter(slot => isSameDayAs(slot.date, selectedDate));
  }, [slots, selectedDate]);

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

  const openCreateModal = () => {
    setFormData({
      date: formatDateForAPI(selectedDate),
      start_time: '09:00',
      end_time: '09:30',
      location: '',
      meeting_type: 'either',
      notes: ''
    });
    setError('');
    setCreateModal(true);
  };

  const openEditModal = (slot) => {
    setSelectedSlot(slot);
    setFormData({
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      location: slot.location || '',
      meeting_type: slot.meeting_type,
      notes: slot.notes || ''
    });
    setError('');
    setEditModal(true);
  };

  const openDeleteModal = (slot) => {
    setSelectedSlot(slot);
    setDeleteModal(true);
  };

  const handleCreate = async () => {
    setLoading(true);
    setError('');

    try {
      await slotsAPI.createSlot(formData);
      setSuccess('Slot created successfully');
      setCreateModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      await slotsAPI.updateSlot(selectedSlot.id, formData);
      setSuccess('Slot updated successfully');
      setEditModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update slot');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      await slotsAPI.deleteSlot(selectedSlot.id);
      setSuccess('Slot deleted successfully');
      setDeleteModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete slot');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreate = async () => {
    // Create slots for the entire week
    const slotsToCreate = [];
    const baseSlot = {
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location,
      meeting_type: formData.meeting_type,
      notes: formData.notes
    };

    // Add slots for each weekday
    days.forEach(day => {
      const dayOfWeek = day.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip weekends
        slotsToCreate.push({
          ...baseSlot,
          date: formatDateForAPI(day)
        });
      }
    });

    setLoading(true);
    setError('');

    try {
      const result = await slotsAPI.createBulkSlots(slotsToCreate);
      setSuccess(`Created ${result.data.created.length} slots`);
      setCreateModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create slots');
    } finally {
      setLoading(false);
    }
  };

  const SlotForm = ({ onSubmit, submitText, showBulk = false }) => (
    <>
      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div className="form-row">
        <FormInput
          label="Date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
          min={formatDateForAPI(new Date())}
        />
        <FormSelect
          label="Meeting Type"
          value={formData.meeting_type}
          onChange={(e) => setFormData({ ...formData, meeting_type: e.target.value })}
          options={[
            { value: 'either', label: 'In-person or Virtual' },
            { value: 'in-person', label: 'In-person Only' },
            { value: 'virtual', label: 'Virtual Only' }
          ]}
        />
      </div>

      <div className="form-row">
        <FormInput
          label="Start Time"
          type="time"
          value={formData.start_time}
          onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          required
        />
        <FormInput
          label="End Time"
          type="time"
          value={formData.end_time}
          onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          required
        />
      </div>

      <FormInput
        label="Location"
        placeholder="e.g., Room 301, Building A"
        value={formData.location}
        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
      />

      <FormTextarea
        label="Notes (Optional)"
        placeholder="Any special instructions for students..."
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        rows={2}
      />
    </>
  );

  return (
    <>
      <PageHeader 
        title="Manage Availability"
        subtitle="Set your office hours for students to book"
        action={
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Add Time Slot
          </button>
        }
      />
      
      <div className="page-content">
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

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
              const hasBookings = daySlots.some(s => s.is_booked);

              return (
                <button
                  key={day.toISOString()}
                  className={`date-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(day)}
                  style={{ position: 'relative' }}
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
                      background: hasBookings 
                        ? (isSelected ? 'white' : 'var(--color-accent)') 
                        : (isSelected ? 'white' : 'var(--color-success)')
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Slots for Selected Date */}
        <Card 
          title={`Slots for ${formatDate(selectedDate, 'EEEE, MMMM d')}`}
          action={
            <button className="btn btn-secondary btn-sm" onClick={openCreateModal}>
              <Plus size={16} /> Add
            </button>
          }
        >
          {loadingSlots ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <Spinner />
            </div>
          ) : filteredSlots.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No slots for this date"
              description="Add availability slots so students can book appointments with you."
              action={
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <Plus size={18} />
                  Add Time Slot
                </button>
              }
            />
          ) : (
            <div className="slots-grid">
              {filteredSlots.map(slot => (
                <div 
                  key={slot.id} 
                  className={`slot-card ${slot.is_booked ? 'booked' : ''}`}
                >
                  <div>
                    <div className="slot-time">
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </div>
                    {slot.is_booked ? (
                      <Badge variant="warning">Booked</Badge>
                    ) : (
                      <Badge variant="success">Available</Badge>
                    )}
                  </div>
                  
                  <div className="slot-info">
                    {slot.is_booked && slot.appointment ? (
                      <div className="slot-instructor">
                        <User size={14} style={{ marginRight: '4px' }} />
                        {slot.appointment.student.first_name} {slot.appointment.student.last_name}
                        {slot.appointment.topic && (
                          <span className="text-sm text-secondary" style={{ display: 'block' }}>
                            {slot.appointment.topic}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="slot-details">
                        {slot.location && <span>{slot.location}</span>}
                        <span>{slot.meeting_type === 'either' ? 'Any format' : slot.meeting_type}</span>
                      </div>
                    )}
                  </div>

                  {!slot.is_booked && (
                    <div className="slot-actions">
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => openEditModal(slot)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => openDeleteModal(slot)}
                        style={{ color: 'var(--color-error)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        title="Add Availability Slot"
        size="md"
        footer={
          <>
            <button 
              className="btn btn-secondary" 
              onClick={() => setCreateModal(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? <Spinner size={18} /> : 'Create Slot'}
            </button>
          </>
        }
      >
        <SlotForm />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Availability Slot"
        size="md"
        footer={
          <>
            <button 
              className="btn btn-secondary" 
              onClick={() => setEditModal(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleUpdate}
              disabled={loading}
            >
              {loading ? <Spinner size={18} /> : 'Save Changes'}
            </button>
          </>
        }
      >
        <SlotForm />
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Slot"
        footer={
          <>
            <button 
              className="btn btn-secondary" 
              onClick={() => setDeleteModal(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? <Spinner size={18} /> : 'Delete Slot'}
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this availability slot?</p>
        {selectedSlot && (
          <div style={{ 
            padding: 'var(--space-md)', 
            background: 'var(--color-bg)', 
            borderRadius: 'var(--radius-md)',
            marginTop: 'var(--space-lg)'
          }}>
            <div><strong>{formatDate(selectedSlot.date, 'EEEE, MMMM d')}</strong></div>
            <div>{formatTimeRange(selectedSlot.start_time, selectedSlot.end_time)}</div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AvailabilityManagement;
