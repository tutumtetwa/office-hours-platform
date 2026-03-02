import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Spinner, FormInput, Alert } from '../components/UI';
import api from '../utils/api';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', department: '' });
  const [emailPrefs, setEmailPrefs] = useState({
    email_booking_confirmation: true,
    email_booking_reminder: true,
    email_cancellation: true
  });
  const [passwordData, setPasswordData] = useState({ current: '', new_password: '', confirm: '' });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setFormData({
          first_name: res.data.user.first_name || '',
          last_name: res.data.user.last_name || '',
          department: res.data.user.department || ''
        });
        setEmailPrefs({
          email_booking_confirmation: res.data.user.email_booking_confirmation !== false,
          email_booking_reminder: res.data.user.email_booking_reminder !== false,
          email_cancellation: res.data.user.email_cancellation !== false
        });
      } catch (e) {
        setMessage({ type: 'error', text: 'Failed to load user data' });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', formData);
      setMessage({ type: 'success', text: 'Profile updated!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmailPrefs = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await api.put('/auth/profile', emailPrefs);
      setMessage({ type: 'success', text: 'Email preferences updated!' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to update email preferences' });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleToggle = (key) => {
    setEmailPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setSaving(true);
    try {
      await api.put('/auth/password', { current_password: passwordData.current, new_password: passwordData.new_password });
      setMessage({ type: 'success', text: 'Password changed!' });
      setPasswordData({ current: '', new_password: '', confirm: '' });
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-container"><Spinner /></div>;

  return (
    <div className="page-container">
      <PageHeader title="Settings" subtitle="Manage your account settings" />
      
      {message && <Alert type={message.type} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Card title="Profile Information" className="mb-lg">
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled className="form-input" style={{backgroundColor: '#f3f4f6'}} />
          </div>
          <div className="form-row">
            <FormInput label="First Name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
            <FormInput label="Last Name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
          </div>
          <FormInput label="Department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </Card>

      <Card title="Email Notifications" className="mb-lg">
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Choose which email notifications you'd like to receive.
        </p>
        <form onSubmit={handleSaveEmailPrefs}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 500, color: '#1f2937' }}>Booking Confirmations</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Receive an email when you book or someone books with you</div>
              </div>
              <div 
                onClick={() => handleToggle('email_booking_confirmation')}
                style={{
                  width: '48px',
                  height: '26px',
                  backgroundColor: emailPrefs.email_booking_confirmation ? '#1e3a5f' : '#d1d5db',
                  borderRadius: '13px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: emailPrefs.email_booking_confirmation ? '24px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 500, color: '#1f2937' }}>Appointment Reminders</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Receive reminders 24 hours and 1 hour before appointments</div>
              </div>
              <div 
                onClick={() => handleToggle('email_booking_reminder')}
                style={{
                  width: '48px',
                  height: '26px',
                  backgroundColor: emailPrefs.email_booking_reminder ? '#1e3a5f' : '#d1d5db',
                  borderRadius: '13px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: emailPrefs.email_booking_reminder ? '24px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', cursor: 'pointer' }}>
              <div>
                <div style={{ fontWeight: 500, color: '#1f2937' }}>Cancellation Notices</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Receive an email when an appointment is cancelled</div>
              </div>
              <div 
                onClick={() => handleToggle('email_cancellation')}
                style={{
                  width: '48px',
                  height: '26px',
                  backgroundColor: emailPrefs.email_cancellation ? '#1e3a5f' : '#d1d5db',
                  borderRadius: '13px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: emailPrefs.email_cancellation ? '24px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
            </label>

          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={savingEmail}>
            {savingEmail ? 'Saving...' : 'Save Email Preferences'}
          </button>
        </form>
      </Card>

      <Card title="Change Password">
        <form onSubmit={handleChangePassword}>
          <FormInput label="Current Password" type="password" value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} required />
          <FormInput label="New Password" type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} required />
          <FormInput label="Confirm New Password" type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} required />
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Changing...' : 'Change Password'}</button>
        </form>
      </Card>
    </div>
  );
};

export default Settings;