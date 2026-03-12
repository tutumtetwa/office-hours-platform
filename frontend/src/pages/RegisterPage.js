import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Alert, Spinner } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    email: '', password: '', confirm_password: '',
    first_name: '', last_name: '', role: 'student'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    const result = await register(formData);
    if (result.success) {
      navigate('/verify-email', { state: { verification_token: result.data.verification_token } });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-split">
      {/* Brand panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <GraduationCap size={44} />
            <span>Office Hours</span>
          </div>
          <p className="auth-brand-tagline">
            Join thousands of students and instructors connecting through our platform.
          </p>
          <ul className="auth-brand-features">
            <li><CheckCircle size={16} /> Free to use</li>
            <li><CheckCircle size={16} /> Secure &amp; private</li>
            <li><CheckCircle size={16} /> Set up in minutes</li>
          </ul>
        </div>
        <div className="auth-brand-circle auth-brand-circle-1" />
        <div className="auth-brand-circle auth-brand-circle-2" />
        <div className="auth-brand-circle auth-brand-circle-3" />
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <button
          className="dark-toggle-auth"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
        >
          {darkMode ? '☀️' : '🌙'}
        </button>

        <div className="auth-form-inner">
          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <GraduationCap size={28} />
            <span>Office Hours</span>
          </div>

          <h2 className="auth-form-title">Create Account</h2>
          <p className="auth-form-subtitle">Join the Office Hours Platform</p>

          {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>First Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@university.edu"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Role</label>
              <select
                className="form-input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Confirm Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-block"
              style={{
                background: 'var(--color-accent)',
                color: '#1a1a1a',
                border: 'none',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              disabled={loading}
            >
              {loading ? <Spinner size={20} /> : 'Create Account'}
            </button>
          </form>

          <p className="auth-footer" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
