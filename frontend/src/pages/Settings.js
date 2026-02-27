import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Bell, Shield, Save, Check } from 'lucide-react';
import { PageHeader, Card, Alert, Spinner, FormInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile form
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    department: '',
    email_notifications: true,
    sms_notifications: true
  });
  
  // Password form
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: formatPhoneDisplay(user.phone_number) || '',
        department: user.department || '',
        email_notifications: user.email_notifications !== 0,
        sms_notifications: user.sms_notifications !== 0
      });
    }
  }, [user]);

  // Format phone for display
  function formatPhoneDisplay(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.put('/auth/profile', {
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone_number: profile.phone_number.replace(/\D/g, ''),
        department: profile.department,
        email_notifications: profile.email_notifications ? 1 : 0,
        sms_notifications: profile.sms_notifications ? 1 : 0
      });
      
      if (updateUser && res.data.user) {
        updateUser(res.data.user);
      }
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (passwords.new_password !== passwords.confirm_password) {
      setError('New passwords do not match');
      setSaving(false);
      return;
    }

    if (passwords.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      setSaving(false);
      return;
    }

    try {
      await api.put('/auth/password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      
      setSuccess('Password changed successfully!');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to change password');
    }
    setSaving(false);
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account preferences" />
      
      <div className="page-content">
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

        <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
          {/* Profile Settings */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <User size={24} color="#1e3a5f" />
              <h3 style={{ color: '#1e3a5f', margin: 0 }}>Profile Information</h3>
            </div>
            
            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                  <Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', background: '#f5f5f5', color: '#888' }}
                />
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>Contact admin to change email</p>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                  <Phone size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  placeholder="(555) 123-4567"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
                <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>Used for SMS notifications and password reset</p>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                  Department
                </label>
                <input
                  type="text"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="e.g., Computer Science"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={saving}>
                {saving ? <Spinner size={18} /> : <><Save size={18} /> Save Changes</>}
              </button>
            </form>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Bell size={24} color="#1e3a5f" />
              <h3 style={{ color: '#1e3a5f', margin: 0 }}>Notification Preferences</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profile.email_notifications}
                  onChange={(e) => setProfile({ ...profile, email_notifications: e.target.checked })}
                  style={{ width: '20px', height: '20px', accentColor: '#c9a227' }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: '#1e3a5f' }}>Email Notifications</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>Receive appointment reminders and updates via email</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profile.sms_notifications}
                  onChange={(e) => setProfile({ ...profile, sms_notifications: e.target.checked })}
                  style={{ width: '20px', height: '20px', accentColor: '#c9a227' }}
                />
                <div>
                  <div style={{ fontWeight: '500', color: '#1e3a5f' }}>SMS Notifications</div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    Receive text message reminders 
                    {!profile.phone_number && <span style={{ color: '#f57c00' }}> (Add phone number above)</span>}
                  </div>
                </div>
              </label>
            </div>

            <button onClick={handleUpdateProfile} className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={saving}>
              {saving ? <Spinner size={18} /> : <><Save size={18} /> Save Preferences</>}
            </button>
          </Card>

          {/* Change Password */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Shield size={24} color="#1e3a5f" />
              <h3 style={{ color: '#1e3a5f', margin: 0 }}>Change Password</h3>
            </div>

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.new_password}
                    onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm_password}
                    onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '1.5rem' }} disabled={saving}>
                {saving ? <Spinner size={18} /> : 'Change Password'}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Settings;