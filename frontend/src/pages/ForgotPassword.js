import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, Alert, Spinner } from '../components/UI';
import api from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/password-reset/request', { email });
      if (res.data.temp_token) {
        setTempToken(res.data.temp_token);
        const sendRes = await api.post('/password-reset/send-code', { temp_token: res.data.temp_token, method: 'email' });
        setSuccess(sendRes.data.message);
        setStep(2);
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
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/password-reset/verify-code', { temp_token: tempToken, code });
      setResetToken(res.data.reset_token);
      setSuccess('Code verified!');
      setStep(3);
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/password-reset/reset', { reset_token: resetToken, new_password: newPassword });
      setSuccess('Password reset! Redirecting...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card className="auth-card">
        <h2 className="auth-title">Reset Password</h2>
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {step === 1 && (
          <form onSubmit={handleRequestReset}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <Spinner size={20} /> : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyCode}>
            <div className="form-group">
              <label>Enter 6-digit Code</label>
              <input type="text" className="form-input" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem'}} />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <Spinner size={20} /> : 'Verify Code'}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <Spinner size={20} /> : 'Reset Password'}
            </button>
          </form>
        )}

        <p className="auth-footer"><Link to="/login">← Back to Login</Link></p>
      </Card>
    </div>
  );
};

export default ForgotPassword;
