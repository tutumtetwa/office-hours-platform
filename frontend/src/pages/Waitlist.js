import React, { useState, useEffect } from 'react';
import { Clock, X, Users } from 'lucide-react';
import { PageHeader, Card, Spinner, Alert } from '../components/UI';
import { formatDate, formatTime } from '../utils/dateUtils';
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
      setEntries(res.data.waitlist_entries);
    } catch (e) { setError('Failed to load waitlist'); }
    setLoading(false);
  };

  const leaveWaitlist = async (slotId) => {
    try {
      await api.delete(`/waitlist/leave/${slotId}`);
      setSuccess('Removed from waitlist');
      fetchWaitlist();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError('Failed to leave waitlist'); }
  };

  return (
    <>
      <PageHeader title="My Waitlist" subtitle="Slots you're waiting for"/>
      <div className="page-content">
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        
        <Card>
          {loading ? <div style={{textAlign:'center',padding:'2rem'}}><Spinner/></div> : entries.length === 0 ? (
            <div style={{textAlign:'center',padding:'3rem',color:'#888'}}>
              <Users size={48} style={{marginBottom:'1rem',opacity:0.5}}/>
              <h3>No waitlist entries</h3>
              <p>When a slot you want is full, you can join the waitlist to be notified when it opens up.</p>
            </div>
          ) : (
            <div className="slots-grid">
              {entries.map(e => (
                <div key={e.id} className="slot-card">
                  <div>
                    <div className="slot-time">{formatTime(e.start_time)} - {formatTime(e.end_time)}</div>
                    <div style={{fontSize:'0.875rem',color:'#666'}}>{formatDate(e.date, 'EEE, MMM d')}</div>
                  </div>
                  <div className="slot-info">
                    <div className="slot-instructor">{e.instructor_first_name} {e.instructor_last_name}</div>
                    <div className="slot-details">
                      <span>Position #{e.position}</span>
                      {e.location && <span>• {e.location}</span>}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => leaveWaitlist(e.slot_id)} style={{color:'var(--color-error)'}}>
                    <X size={16}/> Leave
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default Waitlist;
