import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Alert, Select } from '../components/UI';
import { authAPI } from '../utils/api';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: ''
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    email_booking_confirmation: true,
    email_booking_reminder: true,
    email_cancellation: true
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getMe();
      const userData = response.data.user;
      setUser(userData);
      setProfileData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        email: userData.email || '',
        department: userData.department || ''
      });
      setNotifications({
        email_booking_confirmation: userData.email_booking_confirmation ?? true,
        email_booking_reminder: userData.email_booking_reminder ?? true,
        email_cancellation: userData.email_cancellation ?? true
      });
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({ ...prev, [name]: checked }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await authAPI.updateProfile({
        ...profileData,
        ...notifications
      });
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      setSaving(false);
      return;
    }

    if (passwordData.new_password.length < 8) {
      setError('New password must be at least 8 characters');
      setSaving(false);
      return;
    }

    try {
      await authAPI.updatePassword(passwordData.current_password, passwordData.new_password);
      setSuccess('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {error && <Alert type="error" className="mb-6">{error}</Alert>}
      {success && <Alert type="success" className="mb-6">{success}</Alert>}

      {/* Profile Settings */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
        <form onSubmit={handleProfileSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              name="first_name"
              type="text"
              value={profileData.first_name}
              onChange={handleProfileChange}
              required
            />
            <Input
              label="Last Name"
              name="last_name"
              type="text"
              value={profileData.last_name}
              onChange={handleProfileChange}
              required
            />
          </div>

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={profileData.email}
            onChange={handleProfileChange}
            required
            disabled
            className="bg-gray-100"
          />

          <Input
            label="Department"
            name="department"
            type="text"
            value={profileData.department}
            onChange={handleProfileChange}
            placeholder="e.g., Computer Science"
          />

          <Button type="submit" loading={saving}>
            Save Profile
          </Button>
        </form>
      </Card>

      {/* Notification Preferences */}
      <Card className="mb-8 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Email Notifications</h2>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="email_booking_confirmation"
              checked={notifications.email_booking_confirmation}
              onChange={handleNotificationChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">Booking confirmations</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="email_booking_reminder"
              checked={notifications.email_booking_reminder}
              onChange={handleNotificationChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">Appointment reminders (24 hours before)</span>
          </label>

          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="email_cancellation"
              checked={notifications.email_cancellation}
              onChange={handleNotificationChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">Cancellation notifications</span>
          </label>

          <div className="pt-4">
            <Button onClick={handleProfileSubmit} loading={saving}>
              Save Preferences
            </Button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <Input
            label="Current Password"
            name="current_password"
            type="password"
            value={passwordData.current_password}
            onChange={handlePasswordChange}
            required
          />

          <Input
            label="New Password"
            name="new_password"
            type="password"
            value={passwordData.new_password}
            onChange={handlePasswordChange}
            required
            minLength={8}
            placeholder="At least 8 characters"
          />

          <Input
            label="Confirm New Password"
            name="confirm_password"
            type="password"
            value={passwordData.confirm_password}
            onChange={handlePasswordChange}
            required
            minLength={8}
          />

          <Button type="submit" loading={saving}>
            Change Password
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Settings;
