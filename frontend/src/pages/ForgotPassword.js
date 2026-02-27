import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowLeft, Shield, Key, CheckCircle } from 'lucide-react';
import { Card, Alert, Spinner } from '../components/UI';
import api from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Enter email, 2: Choose method, 3: Enter code, 4: New password, 5: Success
  const [email, setEmail] = useState('');
  const [methods, setMethods] = useState([]);
  const [tempToken, setTempToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Step 1: Request reset
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/password-reset/request', { email });
      if (res.data.methods && res.data.methods.length > 0) {
        setMethods(res.data.methods);
        setTempToken(res.data.temp_token);
        setStep(2);
      } else {
        setMessage(res.data.message);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to process request');
    }
    setLoading(false);
  };

  // Step 2: Send code via selected method
  const handleSendCode = async (method) => {
    setLoading(true);
    setError('');
    setSelectedMethod(method);
    
    try {
      const res = await api.post('/password-reset/send-code', { temp_token: tempToken, method });
      setMessage(res.data.message);
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send code');
    }
    setLoading(false);
  };

  // Step 3: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/password-reset/verify-code', { temp_token: tempToken, code });
      setResetToken(res.data.reset_token);
      setStep(4);
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid or expired code');
    }
    setLoading(false);
  };

  // Step 4: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      await api.post('/password-reset/reset', { reset_token: resetToken, new_password: newPassword });
      setStep(5);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reset password');
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%)',
      padding: '2rem'
    }}>
      <Card style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '50%', 
            background: '#f8f6f3', display: 'flex', alignItems: 'center', 
            justifyContent: 'center', margin: '0 auto 1rem'
          }}>
            {step === 5 ? <CheckCircle size={30} color="#2e7d32" /> : <Key size={30} color="#1e3a5f" />}
          </div>
          <h2 style={{ color: '#1e3a5f', marginBottom: '0.5rem' }}>
            {step === 1 && 'Forgot Password?'}
            {step === 2 && 'Choose Reset Method'}
            {step === 3 && 'Enter Code'}
            {step === 4 && 'Create New Password'}
            {step === 5 && 'Password Reset!'}
          </h2>
          <p style={{ color: '#666', fontSize: '0.9rem' }}>
            {step === 1 && "Enter your email and we'll help you reset your password"}
            {step === 2 && "Select how you'd like to receive your reset code"}
            {step === 3 && message}
            {step === 4 && "Enter your new password below"}
            {step === 5 && "Your password has been reset successfully"}
          </p>
        </div>

        {error && <Alert type="error" style={{ marginBottom: '1rem' }}>{error}</Alert>}
        {message && step === 1 && <Alert type="success" style={{ marginBottom: '1rem' }}>{message}</Alert>}

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestReset}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
                style={{ 
                  width: '100%', padding: '0.75rem', borderRadius: '8px', 
                  border: '1px solid #ddd', fontSize: '1rem'
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <Spinner size={18} /> : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2: Choose Method */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {methods.map(method => (
              <button
                key={method.type}
                onClick={() => handleSendCode(method.type)}
                disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '1rem', borderRadius: '8px', border: '2px solid #e0e0e0',
                  background: 'white', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#c9a227'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
              >
                {method.type === 'email' ? (
                  <Mail size={24} color="#1e3a5f" />
                ) : (
                  <Phone size={24} color="#1e3a5f" />
                )}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '600', color: '#1e3a5f' }}>
                    {method.type === 'email' ? 'Email' : 'Text Message (SMS)'}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
                    Send code to {method.masked}
                  </div>
                </div>
              </button>
            ))}
            {loading && <div style={{ textAlign: 'center' }}><Spinner size={24} /></div>}
          </div>
        )}

        {/* Step 3: Enter Code */}
        {step === 3 && (
          <form onSubmit={handleVerifyCode}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                6-Digit Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                style={{ 
                  width: '100%', padding: '1rem', borderRadius: '8px', 
                  border: '1px solid #ddd', fontSize: '1.5rem', textAlign: 'center',
                  letterSpacing: '0.5rem', fontWeight: '600'
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || code.length !== 6}>
              {loading ? <Spinner size={18} /> : 'Verify Code'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(2)} 
              className="btn btn-ghost" 
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Resend Code
            </button>
          </form>
        )}

        {/* Step 4: New Password */}
        {step === 4 && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{ 
                  width: '100%', padding: '0.75rem', borderRadius: '8px', 
                  border: '1px solid #ddd', fontSize: '1rem'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#1e3a5f' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ 
                  width: '100%', padding: '0.75rem', borderRadius: '8px', 
                  border: '1px solid #ddd', fontSize: '1rem'
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <Spinner size={18} /> : 'Reset Password'}
            </button>
          </form>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              background: '#e8f5e9', borderRadius: '8px', padding: '1rem', 
              marginBottom: '1rem', color: '#2e7d32'
            }}>
              <Shield size={24} style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: 0 }}>Your password has been changed successfully.</p>
            </div>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Sign In
            </Link>
          </div>
        )}

        {/* Back to login */}
        {step !== 5 && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link to="/login" style={{ color: '#2d5a8a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ForgotPassword;