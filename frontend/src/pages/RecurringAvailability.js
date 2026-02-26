import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Calendar } from 'lucide-react';
import { PageHeader, Card, Spinner, Modal, FormInput, FormSelect, Alert } from '../components/UI';
import api from '../utils/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const RecurringAvailability = () => {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    day_of_week: 1, start_time: '09:00', end_time: '12:00', slot_duration: 30,
    buffer_minutes: 5, location: '', meeting_type: 'either', start_date: '', end_date: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchPatterns(); }, []);

  const fetchPatterns = async () => {
    try {
      const res = await api.get('/recurring');
      setPatterns(res.data.patterns);
    } catch (e) { setError('Failed to load patterns'); }
    setLoading(false);
  };

  const handleCreate = async () => {
    setActionLoading(true); setError('');
    try {
      const res = await api.post('/recurring', { ...formData, generate_slots: true });
      setSuccess(`Pattern created! ${res.data.slots_created} slots generated.`);
      setCreateModal(false);
      fetchPatterns();
      setTimeout(() => setSuccess(''), 5000);
    } catch (e) { setError(e.response?.data?.error || 'Failed to create pattern'); }
    setActionLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this recurring pattern?')) return;
    try {
      await api.delete(`/recurring/${id}?delete_future_slots=true`);
      setSuccess('Pattern deleted');
      fetchPatterns();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError('Failed to delete'); }
  };

  const handleRegenerate = async (id) => {
    try {
      const res = await api.post(`/recurring/${id}/generate`, { weeks_ahead: 8 });
      setSuccess(`Generated ${res.data.slots_created} new slots`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) { setError('Failed to generate slots'); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <>
      <PageHeader title="Recurring Availability" subtitle="Set up weekly office hours patterns"
        action={<button className="btn btn-primary" onClick={() => { setFormData({ ...formData, start_date: today }); setCreateModal(true); }}><Plus size={18}/> New Pattern</button>}
      />
      <div className="page-content">
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        
        <Card>
          {loading ? <div style={{textAlign:'center',padding:'2rem'}}><Spinner/></div> : patterns.length === 0 ? (
            <div style={{textAlign:'center',padding:'3rem',color:'#888'}}>
              <Calendar size={48} style={{marginBottom:'1rem',opacity:0.5}}/>
              <h3>No recurring patterns</h3>
              <p>Create a pattern to automatically generate weekly office hours slots.</p>
            </div>
          ) : (
            <div style={{display:'grid',gap:'1rem'}}>
              {patterns.map(p => (
                <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem',background:'#f8f6f3',borderRadius:'8px',borderLeft:'4px solid #c9a227'}}>
                  <div>
                    <strong style={{color:'#1e3a5f',fontSize:'1.1rem'}}>{p.day_name}s</strong>
                    <div style={{color:'#666',marginTop:'4px'}}>{p.start_time} - {p.end_time}</div>
                    <div style={{color:'#888',fontSize:'0.875rem'}}>{p.location || 'No location'} • {p.meeting_type} • {p.buffer_minutes}min buffer</div>
                  </div>
                  <div style={{display:'flex',gap:'0.5rem'}}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleRegenerate(p.id)} title="Generate more slots"><RefreshCw size={16}/></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p.id)} style={{color:'var(--color-error)'}}><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Create Recurring Pattern" footer={
        <><button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleCreate} disabled={actionLoading}>{actionLoading ? <Spinner size={18}/> : 'Create & Generate Slots'}</button></>
      }>
        {error && <Alert type="error">{error}</Alert>}
        <FormSelect label="Day of Week" value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: parseInt(e.target.value)})}
          options={DAYS.map((d,i) => ({value:i, label:d}))}/>
        <div className="form-row">
          <FormInput label="Start Time" type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})}/>
          <FormInput label="End Time" type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})}/>
        </div>
        <div className="form-row">
          <FormSelect label="Slot Duration" value={formData.slot_duration} onChange={e => setFormData({...formData, slot_duration: parseInt(e.target.value)})}
            options={[{value:15,label:'15 min'},{value:20,label:'20 min'},{value:30,label:'30 min'},{value:45,label:'45 min'},{value:60,label:'60 min'}]}/>
          <FormSelect label="Buffer Between" value={formData.buffer_minutes} onChange={e => setFormData({...formData, buffer_minutes: parseInt(e.target.value)})}
            options={[{value:0,label:'None'},{value:5,label:'5 min'},{value:10,label:'10 min'},{value:15,label:'15 min'}]}/>
        </div>
        <FormInput label="Location" placeholder="Room 301" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}/>
        <FormSelect label="Meeting Type" value={formData.meeting_type} onChange={e => setFormData({...formData, meeting_type: e.target.value})}
          options={[{value:'either',label:'In-person or Virtual'},{value:'in-person',label:'In-person only'},{value:'virtual',label:'Virtual only'}]}/>
        <div className="form-row">
          <FormInput label="Start Date" type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} min={today}/>
          <FormInput label="End Date (optional)" type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}/>
        </div>
      </Modal>
    </>
  );
};

export default RecurringAvailability;
