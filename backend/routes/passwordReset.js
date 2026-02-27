const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const crypto = require('crypto');

const router = express.Router();

// Generate 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
      'SELECT id, email, phone_number, first_name FROM users WHERE email = $1 AND is_active = 1',
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
    
    // Determine available reset methods
    const methods = [];
    methods.push({ type: 'email', masked: maskEmail(user.email) });
    
    if (user.phone_number) {
      methods.push({ type: 'sms', masked: maskPhone(user.phone_number) });
    }

    // Store user ID temporarily (in production, use Redis or session)
    // For now, we'll return a temporary token
    const tempToken = crypto.randomBytes(32).toString('hex');
    
    await pool.query(
      `INSERT INTO password_resets (id, user_id, temp_token, expires_at, created_at) 
       VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', NOW())
       ON CONFLICT (user_id) DO UPDATE SET temp_token = $3, expires_at = NOW() + INTERVAL '15 minutes', code = NULL, verified = false`,
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

// Send reset code - Step 2
router.post('/send-code', async (req, res) => {
  try {
    const { temp_token, method } = req.body;

    if (!temp_token || !method) {
      return res.status(400).json({ error: 'Token and method are required' });
    }

    // Find the reset request
    const resetResult = await pool.query(
      `SELECT pr.*, u.email, u.phone_number, u.first_name 
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

    // Update with the code
    await pool.query(
      'UPDATE password_resets SET code = $1, code_sent_via = $2, code_sent_at = NOW() WHERE id = $3',
      [code, method, reset.id]
    );

    // Send the code
    if (method === 'email') {
      await sendEmailCode(reset.email, reset.first_name, code);
      res.json({ 
        message: `Reset code sent to ${maskEmail(reset.email)}`,
        method: 'email'
      });
    } else if (method === 'sms') {
      if (!reset.phone_number) {
        return res.status(400).json({ error: 'No phone number on file' });
      }
      await sendSMSCode(reset.phone_number, code);
      res.json({ 
        message: `Reset code sent to ${maskPhone(reset.phone_number)}`,
        method: 'sms'
      });
    } else {
      return res.status(400).json({ error: 'Invalid method' });
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

    const resetResult = await pool.query(
      `SELECT * FROM password_resets 
       WHERE temp_token = $1 AND code = $2 AND expires_at > NOW() AND code_sent_at > NOW() - INTERVAL '10 minutes'`,
      [temp_token, code]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    // Mark as verified and generate reset token
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

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const resetResult = await pool.query(
      `SELECT pr.*, u.email FROM password_resets pr 
       JOIN users u ON pr.user_id = u.id
       WHERE pr.reset_token = $1 AND pr.verified = true AND pr.expires_at > NOW()`,
      [reset_token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const reset = resetResult.rows[0];
    const hashedPassword = bcrypt.hashSync(new_password, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, reset.user_id]
    );

    // Delete the reset request
    await pool.query('DELETE FROM password_resets WHERE id = $1', [reset.id]);

    // Log the action
    await pool.query(
      'INSERT INTO audit_logs (id, user_id, action, details, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [uuidv4(), reset.user_id, 'PASSWORD_RESET', JSON.stringify({ method: reset.code_sent_via })]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Helper functions
function maskEmail(email) {
  const [local, domain] = email.split('@');
  const maskedLocal = local.charAt(0) + '***' + local.charAt(local.length - 1);
  return `${maskedLocal}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  return '***-***-' + cleaned.slice(-4);
}

// Email sending function (uses nodemailer or your email service)
async function sendEmailCode(email, firstName, code) {
  // Check if email service is configured
  if (!process.env.SMTP_HOST) {
    console.log(`[DEV MODE] Email code for ${email}: ${code}`);
    return;
  }

  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@officehours.edu',
    to: email,
    subject: 'Password Reset Code - Office Hours',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e3a5f;">Password Reset</h2>
        <p>Hi ${firstName},</p>
        <p>You requested a password reset. Use this code to reset your password:</p>
        <div style="background: #f8f6f3; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
        </div>
        <p>This code expires in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p style="color: #888; font-size: 12px;">Office Hours Platform</p>
      </div>
    `
  });
}

// SMS sending function (uses Twilio or your SMS service)
async function sendSMSCode(phone, code) {
  // Check if Twilio is configured
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[DEV MODE] SMS code for ${phone}: ${code}`);
    return;
  }

  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body: `Your Office Hours password reset code is: ${code}. This code expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
}

module.exports = router;