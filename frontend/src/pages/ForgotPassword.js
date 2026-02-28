import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Card, Alert } from '../components/UI';
import api from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: enter email, 2: enter code, 3: new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Step 1: Request password reset
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/password-reset/request', { email });
      const { temp_token, methods } = response.data;
      
      if (methods && methods.length > 0) {
        setTempToken(temp_token);
        const emailMethod = methods.find(m => m.type === 'email');
        if (emailMethod) {
          setMaskedEmail(emailMethod.masked);
        }
        // Automatically send the code via email
        await handleSendCode(temp_token);
      } else {
        setSuccess('If an account exists with this email, you will receive reset instructions.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  // Send code via email
  const handleSendCode = async (token) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/password-reset/send-code', {
        temp_token: token || tempToken,
        method: 'email'
      });
      setSuccess(response.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/password-reset/verify-code', {
        temp_token: tempToken,
        code
      });
      setResetToken(response.data.reset_token);
      setSuccess('Code verified! Enter your new password.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/password-reset/reset', {
        reset_token: resetToken,
        new_password: newPassword
      });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    await handleSendCode();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 && "Enter your email to receive a reset code"}
            {step === 2 && `Enter the code sent to ${maskedEmail}`}
            {step === 3 && "Create your new password"}
          </p>
        </div>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Step 1: Enter Email */}
        {step === 1 && (
          <form onSubmit={handleRequestReset} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
            <Button type="submit" fullWidth loading={loading}>
              Send Reset Code
            </Button>
          </form>
        )}

        {/* Step 2: Enter Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <Input
              label="Verification Code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
            />
            <Button type="submit" fullWidth loading={loading}>
              Verify Code
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                className="text-sm text-indigo-600 hover:text-indigo-500"
                disabled={loading}
              >
                Didn't receive code? Resend
              </button>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              minLength={8}
            />
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              minLength={8}
            />
            <Button type="submit" fullWidth loading={loading}>
              Reset Password
            </Button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to Login
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
