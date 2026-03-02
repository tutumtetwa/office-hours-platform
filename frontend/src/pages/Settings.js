import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Spinner, FormInput, Alert, Modal } from '../components/UI';
import api, { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', department: '' });
  const [passwordData, setPasswordData] = useState({ current: '', new_password: '', confirm: '' });
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (!deletePassword) return;
    setDeleting(true);
    try {
      await authAPI.deleteAccount(deletePassword);
      await logout();
      navigate('/login');
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to delete account' });
      setDeleteModal(false);
      setDeletePassword('');
    } finally {
      setDeleting(false);
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

      <Card title="Change Password" className="mb-lg">
        <form onSubmit={handleChangePassword}>
          <FormInput label="Current Password" type="password" value={passwordData.current} onChange={(e) => setPasswordData({...passwordData, current: e.target.value})} required />
          <FormInput label="New Password" type="password" value={passwordData.new_password} onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} required />
          <FormInput label="Confirm New Password" type="password" value={passwordData.confirm} onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})} required />
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Changing...' : 'Change Password'}</button>
        </form>
      </Card>

      <Card>
        <div style={{ borderTop: '2px solid var(--color-error)', paddingTop: 'var(--space-lg)' }}>
          <h3 style={{ color: 'var(--color-error)', marginBottom: 'var(--space-sm)' }}>Danger Zone</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
            Permanently delete your account and all associated data. This cannot be undone.
          </p>
          <button className="btn btn-danger" onClick={() => { setDeletePassword(''); setDeleteModal(true); }}>
            Delete My Account
          </button>
        </div>
      </Card>

      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Account"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeleteModal(false)} disabled={deleting}>Cancel</button>
            <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={deleting || !deletePassword}>
              {deleting ? <Spinner size={18} /> : 'Delete My Account'}
            </button>
          </>
        }
      >
        <p style={{ marginBottom: 'var(--space-md)' }}>
          This will permanently delete your account, appointments, and all your data. Enter your password to confirm.
        </p>
        <FormInput
          label="Your password"
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          placeholder="Enter your password to confirm"
        />
      </Modal>
    </div>
  );
};

export default Settings;
