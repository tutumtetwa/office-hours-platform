import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Alert, Spinner } from '../components/UI';

const SetupPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setupPassword } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const setupToken = location.state?.setup_token;

  const [formData, setFormData] = useState({ new_password: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!setupToken) {
      navigate('/login');
    }
  }, [setupToken, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (formData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    setError('');
    const result = await setupPassword(setupToken, formData.new_password);
    if (result.success) {
      if (result.verification_token) {
        navigate('/verify-email', { state: { verification_token: result.verification_token } });
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const strength = (() => {
    const p = formData.new_password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#c23a3a', '#c9a227', '#2d7a4f', '#1e3a5f'][strength];

  return (
    <div className="auth-split">
      {/* Brand panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-brand-icon">
            <Lock size={40} />
          </div>
          <h1 className="auth-brand-title">Set Your Password</h1>
          <p className="auth-brand-tagline">Create a strong password to secure your account.</p>
          <ul className="auth-brand-features">
            <li><CheckCircle size={16} /> At least 8 characters</li>
            <li><CheckCircle size={16} /> Mix of letters & numbers</li>
            <li><CheckCircle size={16} /> Keep it unique &amp; memorable</li>
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
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <Lock size={28} color="white" />
            </div>
            <h2 className="auth-form-title">Create New Password</h2>
            <p className="auth-form-subtitle">You're required to set a new password before continuing</p>
          </div>

          {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={formData.new_password}
                  onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
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
              {formData.new_password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        height: 4, flex: 1, borderRadius: 2,
                        background: i <= strength ? strengthColor : '#e5e7eb',
                        transition: 'background 0.2s'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: strengthColor }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="form-input"
                  value={formData.confirm_password}
                  onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                  required
                  placeholder="Repeat your password"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formData.confirm_password && formData.new_password !== formData.confirm_password && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>Passwords don't match</p>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              style={{ background: 'var(--color-accent)', border: 'none', color: '#1a1a1a', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? <Spinner size={20} /> : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetupPasswordPage;
