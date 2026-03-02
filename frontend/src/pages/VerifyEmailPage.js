import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../utils/api';
import { Alert, Spinner } from '../components/UI';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyEmail } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();

  const verificationToken = location.state?.verification_token;

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!verificationToken) {
      navigate('/register');
    }
  }, [verificationToken, navigate]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 digits filled
    if (value && index === 5 && newDigits.every(d => d !== '')) {
      handleVerify(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex(d => d === '');
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code) => {
    const codeStr = code || digits.join('');
    if (codeStr.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    const result = await verifyEmail(verificationToken, codeStr);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    setError('');
    try {
      await authAPI.resendVerification(verificationToken);
      setSuccess('New code sent! Check your email.');
      setCooldown(30);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-split">
      {/* Brand panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-inner">
          <div className="auth-brand-icon">
            <Mail size={40} />
          </div>
          <h1 className="auth-brand-title">Check Your Inbox</h1>
          <p className="auth-brand-tagline">We sent a 6-digit verification code to your email address.</p>
          <ul className="auth-brand-features">
            <li><CheckCircle size={16} /> Codes expire in 15 minutes</li>
            <li><CheckCircle size={16} /> Check your spam folder too</li>
            <li><CheckCircle size={16} /> One-time use only</li>
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
              <Mail size={28} color="white" />
            </div>
            <h2 className="auth-form-title">Verify Your Email</h2>
            <p className="auth-form-subtitle">Enter the 6-digit code we sent you</p>
          </div>

          {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert type="success">{success}</Alert>}

          <div className="otp-row" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="otp-input"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: '1.5rem', background: 'var(--color-accent)', border: 'none', color: '#1a1a1a', fontWeight: 600 }}
            onClick={() => handleVerify()}
            disabled={loading || digits.some(d => d === '')}
          >
            {loading ? <Spinner size={20} /> : 'Verify Email'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              style={{
                background: 'none', border: 'none', cursor: cooldown > 0 ? 'default' : 'pointer',
                color: 'var(--color-primary)', fontSize: '0.9rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                opacity: cooldown > 0 ? 0.6 : 1
              }}
            >
              {resending ? <Spinner size={14} /> : <RefreshCw size={14} />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't get it? Resend code"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
