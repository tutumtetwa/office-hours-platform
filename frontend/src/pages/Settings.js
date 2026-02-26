import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Building, Mail } from 'lucide-react';
import { PageHeader, Card, FormInput, Alert, Spinner, RoleBadge } from '../components/UI';

const Settings = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    department: user?.department || ''
  });
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    const result = await updateProfile(profileData);
    
    if (result.success) {
      setProfileSuccess('Profile updated successfully');
      setTimeout(() => setProfileSuccess(''), 3000);
    } else {
      setProfileError(result.error);
    }
    
    setProfileLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      setPasswordLoading(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setPasswordLoading(false);
      return;
    }

    const result = await updatePassword(passwordData.current_password, passwordData.new_password);
    
    if (result.success) {
      setPasswordSuccess('Password updated successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } else {
      setPasswordError(result.error);
    }
    
    setPasswordLoading(false);
  };

  return (
    <>
      <PageHeader 
        title="Settings"
        subtitle="Manage your account settings"
      />
      
      <div className="page-content">
        <div style={{ display: 'grid', gap: 'var(--space-xl)', maxWidth: '800px' }}>
          
          {/* Account Info */}
          <Card title="Account Information">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 'var(--space-lg)',
              padding: 'var(--space-lg)',
              background: 'var(--color-bg)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)'
            }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--color-primary-dark)'
              }}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div>
                <h3 style={{ marginBottom: 'var(--space-xs)' }}>
                  {user?.first_name} {user?.last_name}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <span className="text-secondary">{user?.email}</span>
                  <RoleBadge role={user?.role} />
                </div>
              </div>
            </div>
          </Card>

          {/* Profile Settings */}
          <Card title="Profile Settings">
            {profileSuccess && <Alert type="success">{profileSuccess}</Alert>}
            {profileError && <Alert type="error">{profileError}</Alert>}
            
            <form onSubmit={handleProfileSubmit}>
              <div className="form-row">
                <FormInput
                  label="First Name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  required
                />
                <FormInput
                  label="Last Name"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  required
                />
              </div>
              
              <FormInput
                label="Department"
                value={profileData.department}
                onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                placeholder="e.g., Computer Science"
              />

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={profileLoading}
              >
                {profileLoading ? <Spinner size={18} /> : 'Save Changes'}
              </button>
            </form>
          </Card>

          {/* Change Password */}
          <Card title="Change Password">
            {passwordSuccess && <Alert type="success">{passwordSuccess}</Alert>}
            {passwordError && <Alert type="error">{passwordError}</Alert>}
            
            <form onSubmit={handlePasswordSubmit}>
              <FormInput
                label="Current Password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                required
              />
              
              <div className="form-row">
                <FormInput
                  label="New Password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  hint="At least 8 characters"
                />
                <FormInput
                  label="Confirm New Password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={passwordLoading}
              >
                {passwordLoading ? <Spinner size={18} /> : 'Update Password'}
              </button>
            </form>
          </Card>

        </div>
      </div>
    </>
  );
};

export default Settings;
