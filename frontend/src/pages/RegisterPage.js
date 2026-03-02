import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Alert, Spinner } from '../components/UI';
import api from '../utils/api';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '', confirm_password: '', first_name: '', last_name: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', formData);
      navigate('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Join Office Hours Platform</p>
        {error && <Alert type="error">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input type="text" className="form-input" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" className="form-input" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select className="form-input" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required minLength={8} />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input type="password" className="form-input" value={formData.confirm_password} onChange={(e) => setFormData({...formData, confirm_password: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <Spinner size={20} /> : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </Card>
    </div>
  );
};

export default RegisterPage;
