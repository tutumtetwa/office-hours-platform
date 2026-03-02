import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, KeyRound, Mail, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import { Alert, Spinner } from '../components/UI';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

const STEPS = ['email', 'code', 'password', 'done'];

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();

  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputRefs = useRef([]);

  const code = digits.join('');

  const handleDigitChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleDigitKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('').map((_, i) => pasted[i] || '');
    setDigits(next);
    const first = next.findIndex(d => d === '');
    inputRefs.current[first === -1 ? 5 : first]?.focus();
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/password-reset/request', { email });
      if (res.data.temp_token) {
        setTempToken(res.data.temp_token);
        await api.post('/password-reset/send-code', { temp_token: res.data.temp_token, method: 'email' });
        setSuccess('Code sent! Check your email.');
        setStep('code');
      } else {
        setSuccess(res.data.message);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e?.preventDefault();
    if (code.length !== 6) { setError('Enter all 6 digits'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/password-reset/verify-code', { temp_token: tempToken, code });
      setResetToken(res.data.reset_token);
      setStep('password');
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid or expired code');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/password-reset/reset', { reset_token: resetToken, new_password: newPassword });
      setStep('done');
      setTimeout(() => navigate('/login'), 3000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const brandContent = {
    email: {
      icon: <Mail size={36} />,
      title: 'Forgot Password?',
      tagline: 'No worries — we\'ll send a 6-digit code to your email so you can get back in.',
      features: ['Quick & secure reset', 'Code valid for 10 minutes', 'No account lockout'],
    },
    code: {
      icon: <KeyRound size={36} />,
      title: 'Check Your Email',
      tagline: `We sent a 6-digit code to ${email}. Enter it to continue.`,
      features: ['Code expires in 10 minutes', 'Check spam if not found', 'Request a new code if needed'],
    },
    password: {
      icon: <KeyRound size={36} />,
      title: 'Almost There',
      tagline: 'Choose a strong new password to secure your account.',
      features: ['At least 8 characters', 'Mix letters & numbers', 'Keep it unique'],
    },
    done: {
      icon: <CheckCircle size={36} />,
      title: 'Password Reset!',
      tagline: 'Your password has been updated. Redirecting you to login...',
      features: ['Account secured', 'All sessions cleared', 'Ready to sign in'],
    },
  };

  const brand = brandContent[step];

  const stepNum = { email: 1, code: 2, password: 3, done: 4 }[step];

  return (
    <div className="auth-split">
      {/* Brand panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-brand-logo">
            <GraduationCap size={44} />
            <span>Office Hours</span>
          </div>
          <div className="auth-brand-icon" style={{ marginTop: '1.5rem' }}>
            {brand.icon}
          </div>
          <h1 className="auth-brand-title" style={{ marginTop: '1rem' }}>{brand.title}</h1>
          <p className="auth-brand-tagline">{brand.tagline}</p>
          <ul className="auth-brand-features">
            {brand.features.map(f => (
              <li key={f}><CheckCircle size={16} /> {f}</li>
            ))}
          </ul>

          {/* Step progress dots */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '2rem' }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{
                width: n <= stepNum ? 24 : 8, height: 8, borderRadius: 4,
                background: n < stepNum ? 'var(--color-accent)' : n === stepNum ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s'
              }} />
            ))}
          </div>
        </div>
        <div className="auth-brand-circle auth-brand-circle-1" />
        <div className="auth-brand-circle auth-brand-circle-2" />
        <div className="auth-brand-circle auth-brand-circle-3" />
      </div>

      {/* Form panel */}
      <div className="auth-form-panel">
        <button className="dark-toggle-auth" onClick={toggleDarkMode} aria-label="Toggle dark mode">
          {darkMode ? '☀️' : '🌙'}
        </button>

        <div className="auth-form-inner">
          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <GraduationCap size={28} />
            <span>Office Hours</span>
          </div>

          {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
          {success && step !== 'code' && <Alert type="success">{success}</Alert>}

          {/* Step 1 — Email */}
          {step === 'email' && (
            <>
              <h2 className="auth-form-title">Reset Password</h2>
              <p className="auth-form-subtitle">Enter your email and we'll send you a code</p>
              <form onSubmit={handleRequestReset} style={{ marginTop: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-block" disabled={loading} style={{ background: 'var(--color-accent)', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {loading ? <Spinner size={20} /> : 'Send Reset Code'}
                </button>
              </form>
            </>
          )}

          {/* Step 2 — OTP code */}
          {step === 'code' && (
            <>
              <h2 className="auth-form-title">Enter Your Code</h2>
              <p className="auth-form-subtitle">6-digit code sent to <strong>{email}</strong></p>
              <div className="otp-row" style={{ marginTop: '1.5rem' }} onPaste={handleDigitPaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className="otp-input"
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              <button
                className="btn btn-block"
                style={{ marginTop: '1.5rem', background: 'var(--color-accent)', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
              >
                {loading ? <Spinner size={20} /> : 'Verify Code'}
              </button>
              <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                Didn't get it?{' '}
                <button onClick={handleRequestReset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 500, padding: 0 }}>
                  Resend code
                </button>
              </p>
            </>
          )}

          {/* Step 3 — New password */}
          {step === 'password' && (
            <>
              <h2 className="auth-form-title">New Password</h2>
              <p className="auth-form-subtitle">Choose a strong password for your account</p>
              <form onSubmit={handleResetPassword} style={{ marginTop: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="form-input"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      placeholder="At least 8 characters"
                      style={{ paddingRight: '2.5rem' }}
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Confirm Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat your password"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: '0.25rem' }}>Passwords don't match</p>
                  )}
                </div>
                <button type="submit" className="btn btn-block" disabled={loading} style={{ background: 'var(--color-accent)', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {loading ? <Spinner size={20} /> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* Step 4 — Done */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle size={36} color="var(--color-success)" />
              </div>
              <h2 className="auth-form-title">Password Reset!</h2>
              <p className="auth-form-subtitle" style={{ marginTop: '0.5rem' }}>Redirecting you to login in a moment...</p>
              <button className="btn btn-block" style={{ marginTop: '1.5rem', background: 'var(--color-accent)', color: '#1a1a1a', border: 'none', fontWeight: 700, fontSize: '1rem', padding: '0.875rem', borderRadius: 'var(--radius-md)' }} onClick={() => navigate('/login')}>
                Go to Login
              </button>
            </div>
          )}

          {step !== 'done' && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
                <ArrowLeft size={14} /> Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
