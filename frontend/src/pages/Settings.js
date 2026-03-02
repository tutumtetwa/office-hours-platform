import React, { useState, useEffect } from 'react';
import { PageHeader, Card, Spinner, FormInput, Alert } from '../components/UI';
import api from '../utils/api';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', department: '' });
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
