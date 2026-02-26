import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, Check, Users, Bell } from 'lucide-react';
import { PageHeader, Card, Spinner, Alert, Modal, FormSelect, FormTextarea } from '../components/UI';
import api from '../utils/api';

const BookAppointment = () => {
  const [instructors, setInstructors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [waitlistSlot, setWaitlistSlot] = useState(null);
  const [bookingData, setBookingData] = useState({ meeting_type: 'in-person', topic: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchInstructors(); }, []);
  useEffect(() => { fetchSlots(); }, [selectedInstructor]);

  const fetchInstructors = async () => {
    try {
      const res = await api.get('/slots/instructors');
      setInstructors(res.data.instructors || []);
    } catch (e) { setError('Failed to load instructors'); }
    setLoading(false);
  };

  const fetchSlots = async () => {
    try {
      const params = {};
      if (selectedInstructor) params.instructor_id = selectedInstructor;
      const res = await api.get('/slots', { params });
      setSlots(res.data.slots || []);
    } catch (e) { console.error('Failed to fetch slots:', e); }
  };

  const handleBook = async () => {
    if (!bookingSlot) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/appointments/book', {
        slot_id: bookingSlot.id,
        meeting_type: bookingData.meeting_type,
        topic: bookingData.topic,
        notes: bookingData.notes
      });
      setSuccess('Appointment booked successfully!');
      setBookingSlot(null);
      setBookingData({ meeting_type: 'in-person', topic: '', notes: '' });
      fetchSlots();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to book appointment');
    }
    setSubmitting(false);
  };

  const handleJoinWaitlist = async () => {
    if (!waitlistSlot) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post('/waitlist/join', { slot_id: waitlistSlot.id });
      setSuccess(`Added to waitlist! You are #${res.data.position} in line. You'll be notified if a spot opens up.`);
      setWaitlistSlot(null);
      fetchSlots();
      setTimeout(() => setSuccess(''), 7000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to join waitlist');
    }
    setSubmitting(false);
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const formatTime = (time) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedSlots).sort();

  const getInstructorSlots = (dateSlots) => {
    const byInstructor = {};
    dateSlots.forEach(slot => {
      const instId = slot.instructor_id;
      if (!byInstructor[instId]) byInstructor[instId] = { instructor: slot.instructor, slots: [] };
      byInstructor[instId].slots.push(slot);
    });
    return Object.values(byInstructor);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={48} /></div>;

  return (
    <>
      <PageHeader title="Book Appointment" subtitle="Find and book available office hours" />
      
      <div className="page-content">
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}
        {error && !bookingSlot && !waitlistSlot && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>Filter by Instructor</label>
              <select value={selectedInstructor} onChange={(e) => setSelectedInstructor(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}>
                <option value="">All Instructors</option>
                {instructors.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.first_name} {inst.last_name} - {inst.department}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fffef5', border: '2px solid #c9a227' }}></div>
            <span>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#f5f5f5', border: '1px solid #ccc' }}></div>
            <span>Booked (Join Waitlist)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#e8f5e9', border: '2px solid #2e7d32' }}></div>
            <span>Your Booking</span>
          </div>
        </div>

        {sortedDates.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
              <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>No available slots</h3>
              <p>Check back later or select a different instructor.</p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {sortedDates.map(date => (
              <Card key={date}>
                <h3 style={{ marginBottom: '1rem', color: '#1e3a5f', borderBottom: '2px solid #c9a227', paddingBottom: '0.5rem' }}>
                  {formatDate(date)}
                </h3>
                
                {getInstructorSlots(groupedSlots[date]).map(({ instructor, slots: instSlots }) => (
                  <div key={instructor.id} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <User size={18} color="#2d5a8a" />
                      <span style={{ fontWeight: '600', color: '#1e3a5f' }}>{instructor.first_name} {instructor.last_name}</span>
                      <span style={{ color: '#888', fontSize: '0.875rem' }}>{instructor.department}</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {instSlots.map(slot => (
                        <div key={slot.id}
                          style={{
                            padding: '0.75rem 1rem', borderRadius: '8px', minWidth: '150px', textAlign: 'center',
                            border: slot.is_my_booking ? '2px solid #2e7d32' : slot.is_booked ? '1px solid #e0e0e0' : '2px solid #c9a227',
                            background: slot.is_my_booking ? '#e8f5e9' : slot.is_booked ? '#f9f9f9' : '#fffef5',
                            cursor: slot.is_my_booking ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => {
                            if (slot.is_my_booking) return;
                            if (slot.is_booked) setWaitlistSlot(slot);
                            else setBookingSlot(slot);
                          }}
                          onMouseOver={(e) => !slot.is_my_booking && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)')}
                          onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = 'none')}
                        >
                          <div style={{ fontWeight: '600', color: slot.is_booked && !slot.is_my_booking ? '#888' : '#1e3a5f', textDecoration: slot.is_booked && !slot.is_my_booking ? 'line-through' : 'none' }}>
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          
                          {slot.location && (
                            <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                              <MapPin size={12} /> {slot.location}
                            </div>
                          )}
                          
                          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                            color: slot.is_my_booking ? '#2e7d32' : slot.is_booked ? '#f57c00' : '#c9a227'
                          }}>
                            {slot.is_my_booking ? <><Check size={12} /> Your Booking</> : 
                             slot.is_booked ? <><Users size={12} /> Join Waitlist</> : 
                             'Book Now'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <Modal isOpen={!!bookingSlot} onClose={() => { setBookingSlot(null); setError(''); }} title="Confirm Booking"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setBookingSlot(null); setError(''); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleBook} disabled={submitting}>{submitting ? <Spinner size={18} /> : 'Confirm Booking'}</button>
        </>}>
        {error && <Alert type="error">{error}</Alert>}
        {bookingSlot && (
          <div style={{ background: '#f8f6f3', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Calendar size={18} color="#1e3a5f" /><strong>{formatDate(bookingSlot.date)}</strong></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={18} color="#1e3a5f" /><span>{formatTime(bookingSlot.start_time)} - {formatTime(bookingSlot.end_time)}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={18} color="#1e3a5f" /><span>{bookingSlot.instructor?.first_name} {bookingSlot.instructor?.last_name}</span></div>
            {bookingSlot.location && <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}><MapPin size={18} color="#1e3a5f" /><span>{bookingSlot.location}</span></div>}
          </div>
        )}
        <FormSelect label="Meeting Type" value={bookingData.meeting_type} onChange={(e) => setBookingData({ ...bookingData, meeting_type: e.target.value })}
          options={[{ value: 'in-person', label: 'In-Person' }, { value: 'virtual', label: 'Virtual' }]} />
        <FormTextarea label="Topic (Optional)" placeholder="What would you like to discuss?" value={bookingData.topic} onChange={(e) => setBookingData({ ...bookingData, topic: e.target.value })} rows={3} />
        <FormTextarea label="Additional Notes (Optional)" placeholder="Any additional information..." value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} rows={2} />
      </Modal>

      {/* Waitlist Modal */}
      <Modal isOpen={!!waitlistSlot} onClose={() => { setWaitlistSlot(null); setError(''); }} title="Join Waitlist"
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setWaitlistSlot(null); setError(''); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleJoinWaitlist} disabled={submitting} style={{ background: '#f57c00' }}>
            {submitting ? <Spinner size={18} /> : <><Bell size={16} style={{ marginRight: '0.5rem' }} /> Join Waitlist</>}
          </button>
        </>}>
        {error && <Alert type="error">{error}</Alert>}
        {waitlistSlot && (
          <>
            <div style={{ background: '#fff3e0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid #ffcc80' }}>
              <div style={{ fontWeight: '600', color: '#e65100', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={18} /> This slot is currently booked
              </div>
              <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
                Join the waitlist to be notified if the appointment is cancelled. You'll get an alert and can book the slot before anyone else!
              </p>
            </div>
            <div style={{ background: '#f8f6f3', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Calendar size={18} color="#1e3a5f" /><strong>{formatDate(waitlistSlot.date)}</strong></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}><Clock size={18} color="#1e3a5f" /><span>{formatTime(waitlistSlot.start_time)} - {formatTime(waitlistSlot.end_time)}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><User size={18} color="#1e3a5f" /><span>{waitlistSlot.instructor?.first_name} {waitlistSlot.instructor?.last_name}</span></div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default BookAppointment;