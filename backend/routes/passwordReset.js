const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const crypto = require('crypto');
const { Resend } = require('resend');

const router = express.Router();

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Generate 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Mask email for privacy
function maskEmail(email) {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

// Send email code via Resend
async function sendEmailCode(email, firstName, code) {
  console.log('=== SENDING EMAIL ===');
  console.log('To:', email);
  console.log('Code:', code);

  if (!resend) {
    console.log('[DEV MODE] Email code for', email, ':', code);
    return true;
  }

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'Password Reset Code - Office Hours Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Password Reset Request</h2>
          <p>Hi ${firstName || 'there'},</p>
          <p>You requested to reset your password. Use the code below:</p>
          <div style="background: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1F2937;">${code}</span>
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="font-size: 12px; color: #6B7280;">Office Hours Booking Platform</p>
        </div>
      `
    });
    console.log('Resend response:', result);
    console.log('=== EMAIL SENT SUCCESSFULLY ===');
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

// Request password reset - Step 1
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = 1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists or not for security
      return res.json({ 
        message: 'If an account exists with this email, you will receive reset instructions.',
        methods: []
      });
    }

    const user = userResult.rows[0];
    
    // Only email method available
    const methods = [{ type: 'email', masked: maskEmail(user.email) }];

    // Generate temporary token for this reset session
    const tempToken = crypto.randomBytes(32).toString('hex');

    // Delete any existing reset requests for this user
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

    // Create new reset request
    await pool.query(
      `INSERT INTO password_resets (id, user_id, temp_token, expires_at, created_at) 
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', NOW())`,
      [uuidv4(), user.id, tempToken]
    );

    res.json({ 
      message: 'Choose how you want to receive your reset code',
      methods,
      temp_token: tempToken
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Send code - Step 2
router.post('/send-code', async (req, res) => {
  try {
    const { temp_token, method } = req.body;

    if (!temp_token || !method) {
      return res.status(400).json({ error: 'Token and method are required' });
    }

    // Only email is supported
    if (method !== 'email') {
      return res.status(400).json({ error: 'Only email method is supported' });
    }

    // Find reset request
    const resetResult = await pool.query(
      `SELECT pr.*, u.email, u.first_name 
       FROM password_resets pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.temp_token = $1 AND pr.expires_at > NOW()`,
      [temp_token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset request' });
    }

    const reset = resetResult.rows[0];
    const code = generateCode();

    // Update reset request with code
    await pool.query(
      'UPDATE password_resets SET code = $1, code_sent_via = $2, code_sent_at = NOW() WHERE id = $3',
      [code, 'email', reset.id]
    );

    // Send email
    const sent = await sendEmailCode(reset.email, reset.first_name, code);
    
    if (sent) {
      return res.json({ 
        message: `Reset code sent to ${maskEmail(reset.email)}`,
        method: 'email'
      });
    } else {
      return res.status(500).json({ error: 'Failed to send email. Please try again.' });
    }
  } catch (error) {
    console.error('Send code error:', error);
    res.status(500).json({ error: 'Failed to send code' });
  }
});

// Verify code - Step 3
router.post('/verify-code', async (req, res) => {
  try {
    const { temp_token, code } = req.body;

    if (!temp_token || !code) {
      return res.status(400).json({ error: 'Token and code are required' });
    }

    // Find reset request with matching code
    const resetResult = await pool.query(
      `SELECT * FROM password_resets 
       WHERE temp_token = $1 
       AND code = $2 
       AND expires_at > NOW() 
       AND code_sent_at > NOW() - INTERVAL '10 minutes'`,
      [temp_token, code]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Generate reset token for password change
    const resetToken = crypto.randomBytes(32).toString('hex');

    await pool.query(
      'UPDATE password_resets SET verified = true, reset_token = $1 WHERE id = $2',
      [resetToken, resetResult.rows[0].id]
    );

    res.json({ 
      message: 'Code verified successfully',
      reset_token: resetToken
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Reset password - Step 4
router.post('/reset', async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;

    if (!reset_token || !new_password) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find verified reset request
    const resetResult = await pool.query(
      `SELECT pr.*, u.id as user_id 
       FROM password_resets pr 
       JOIN users u ON pr.user_id = u.id 
       WHERE pr.reset_token = $1 
       AND pr.verified = true 
       AND pr.expires_at > NOW()`,
      [reset_token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const reset = resetResult.rows[0];

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(new_password, salt);

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, reset.user_id]
    );

    // Delete reset request
    await pool.query('DELETE FROM password_resets WHERE id = $1', [reset.id]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
