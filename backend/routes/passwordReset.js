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
      return res.json({ 
        message: 'If an account exists with this email, you will receive reset instructions.',
        methods: []
      });
    }

    const user = userResult.rows[0];
    
    // Determine available reset methods
    const methods = [];
    methods.push({ type: 'email', masked: maskEmail(user.email) });
    
    if (user.phone_number && user.phone_number.length >= 10) {
      methods.push({ type: 'sms', masked: maskPhone(user.phone_number) });
    }

    const tempToken = crypto.randomBytes(32).toString('hex');
    
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
    
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

// Send reset code - Step 2
router.post('/send-code', async (req, res) => {
  try {
    const { temp_token, method } = req.body;

    if (!temp_token || !method) {
      return res.status(400).json({ error: 'Token and method are required' });
    }

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

    await pool.query(
      'UPDATE password_resets SET code = $1, code_sent_via = $2, code_sent_at = NOW() WHERE id = $3',
      [code, method, reset.id]
    );

    if (method === 'email') {
      console.log('=== SENDING EMAIL ===');
      console.log('To:', reset.email);
      console.log('Code:', code);
      
      const sent = await sendEmailCode(reset.email, reset.first_name, code);
      
      if (!sent) {
        console.log('=== EMAIL FAILED ===');
        return res.status(500).json({ error: 'Failed to send email. Check server logs.' });
      }
      
      console.log('=== EMAIL SENT SUCCESSFULLY ===');
      res.json({ 
        message: `Reset code sent to ${maskEmail(reset.email)}`,
        method: 'email'
      });
    } else if (method === 'sms') {
      if (!reset.phone_number) {
        return res.status(400).json({ error: 'No phone number on file' });
      }
      const sent = await sendSMSCode(reset.phone_number, code);
      if (!sent) {
        return res.status(500).json({ error: 'Failed to send SMS. Please try email.' });
      }
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

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, reset.user_id]
    );

    await pool.query('DELETE FROM password_resets WHERE id = $1', [reset.id]);

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

// Email sending function using nodemailer
async function sendEmailCode(email, firstName, code) {
  console.log('sendEmailCode called');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  console.log('SMTP_PASS exists:', !!process.env.SMTP_PASS);
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('[DEV MODE] No SMTP configured');
    console.log('Code for', email, ':', code);
    return true;
  }

  try {
    const nodemailer = require('nodemailer');
    
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    console.log('Sending email...');
    const info = await transporter.sendMail({
      from: `"Office Hours" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Code - Office Hours',
      text: `Your password reset code is: ${code}\n\nThis code expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1e3a5f; text-align: center;">📅 Office Hours</h1>
          <h2 style="color: #1e3a5f;">Password Reset</h2>
          <p>Hi ${firstName || 'there'},</p>
          <p>You requested a password reset. Use this code:</p>
          <div style="background: #f8f6f3; padding: 24px; text-align: center; border-radius: 12px; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e3a5f;">${code}</span>
          </div>
          <p style="color: #666;">This code expires in <strong>10 minutes</strong>.</p>
          <p style="color: #666;">If you didn't request this, ignore this email.</p>
        </div>
      `
    });
    
    console.log('Email sent! Message ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('=== NODEMAILER ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    return false;
  }
}

// SMS sending function
async function sendSMSCode(phone, code) {
  console.log('sendSMSCode called for:', phone);
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.log('[DEV MODE] No Twilio configured');
    console.log('SMS Code for', phone, ':', code);
    return true;
  }

  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    await client.messages.create({
      body: `Your Office Hours password reset code is: ${code}. Expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    console.log('SMS sent to:', formattedPhone);
    return true;
  } catch (error) {
    console.error('Twilio error:', error.message);
    return false;
  }
}

module.exports = router;