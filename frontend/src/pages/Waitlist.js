import React, { useState, useEffect } from 'react';
import { Clock, X, Users, Calendar, MapPin, User, Bell } from 'lucide-react';
import { PageHeader, Card, Spinner, Alert } from '../components/UI';
import api from '../utils/api';

const Waitlist = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchWaitlist(); }, []);

  const fetchWaitlist = async () => {
    try {
      const res = await api.get('/waitlist/my-waitlist');
      setEntries(res.data.waitlist_entries || []);
    } catch (e) { setError('Failed to load waitlist'); }
    setLoading(false);
  };

  const leaveWaitlist = async (slotId) => {
    if (!window.confirm('Are you sure you want to leave this waitlist?')) return;
    try {
      await api.delete(`/waitlist/leave/${slotId}`);
      setSuccess('Removed from waitlist');
      fetchWaitlist();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError('Failed to leave waitlist'); }
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatTime = (time) => {
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={48} /></div>;

  return (
    <>
      <PageHeader title="My Waitlist" subtitle="Slots you're waiting for - you'll be notified when they open up" />
      <div className="page-content">
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        
        {entries.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
              <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>No waitlist entries</h3>
              <p>When a slot you want is booked, click "Join Waitlist" to be notified when it opens up.</p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {entries.map(entry => (
              <Card key={entry.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ background: '#fff3e0', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Bell size={16} color="#f57c00" />
                        <span style={{ fontWeight: '600', color: '#e65100' }}>Position #{entry.position}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#1e3a5f' }}>
                      <Calendar size={18} />
                      <strong>{formatDate(entry.date)}</strong>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#666' }}>
                      <Clock size={18} />
                      <span>{formatTime(entry.start_time)} - {formatTime(entry.end_time)}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#666' }}>
                      <User size={18} />
                      <span>{entry.instructor_first_name} {entry.instructor_last_name}</span>
                      {entry.instructor_department && <span style={{ color: '#999' }}>• {entry.instructor_department}</span>}
                    </div>
                    
                    {entry.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                        <MapPin size={18} />
                        <span>{entry.location}</span>
                      </div>
                    )}
                  </div>
                  
                  <button onClick={() => leaveWaitlist(entry.slot_id)} className="btn btn-ghost" 
                    style={{ color: '#c62828', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <X size={18} /> Leave Waitlist
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Waitlist;