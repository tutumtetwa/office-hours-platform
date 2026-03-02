import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Alert, Spinner } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await login(formData.email, formData.password);
    if (result.success) {
      navigate('/dashboard');
    } else if (result.must_change_password) {
      navigate('/setup-password', { state: { setup_token: result.setup_token } });
    } else if (result.needs_verification) {
      navigate('/verify-email', { state: { verification_token: result.verification_token } });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="auth-split">
      {/* Left brand panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <GraduationCap size={44} />
            <span>Office Hours</span>
          </div>
          <p className="auth-brand-tagline">
            Connect with your professors. Book sessions with ease.
          </p>
          <ul className="auth-brand-features">
            <li><CheckCircle size={16} /> Instant appointment booking</li>
            <li><CheckCircle size={16} /> Real-time availability</li>
            <li><CheckCircle size={16} /> Smart waitlist management</li>
          </ul>
        </div>
        <div className="auth-brand-circle auth-brand-circle-1" />
        <div className="auth-brand-circle auth-brand-circle-2" />
        <div className="auth-brand-circle auth-brand-circle-3" />
      </div>

      {/* Right form panel */}
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

          <h2 className="auth-form-title">Welcome Back</h2>
          <p className="auth-form-subtitle">Sign in to your account to continue</p>

          {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: 'var(--color-text)' }}>
                Email Address
              </label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@university.edu"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: 'var(--color-text)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Your password"
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                Forgot password?
              </Link>
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
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              disabled={loading}
            >
              {loading ? <Spinner size={20} /> : 'Sign In'}
            </button>
          </form>

          <p className="auth-footer" style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
              Sign up
            </Link>
          </p>

          {/* Demo credentials */}
          <div style={{
            marginTop: '1.75rem',
            padding: '1rem',
            background: darkMode ? 'rgba(255,255,255,0.05)' : 'var(--color-info-bg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(30,58,95,0.12)'
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)', marginBottom: '0.6rem' }}>
              Demo Accounts
            </p>
            {[
              { role: 'Admin', email: 'admin@university.edu', pass: 'admin123' },
              { role: 'Instructor', email: 'prof.smith@university.edu', pass: 'instructor123' },
              { role: 'Student', email: 'student@university.edu', pass: 'student123' },
            ].map(({ role, email, pass }) => (
              <button
                key={role}
                type="button"
                onClick={() => setFormData({ email, password: pass })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.3rem 0', textAlign: 'left', gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', minWidth: '64px' }}>{role}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontFamily: 'monospace', flex: 1 }}>{email}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{pass}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
