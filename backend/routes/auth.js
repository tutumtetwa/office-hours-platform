const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { pool } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const { Resend } = require('resend');

const router = express.Router();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, firstName, code) {
  if (!resend) {
    console.log(`[DEV MODE] Verification code for ${email}: ${code}`);
    return true;
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'Verify your email - Office Hours Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0;">Verify Your Email</h1>
          </div>
          <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Hi ${firstName || 'there'},</p>
            <p>Enter this code to verify your email address:</p>
            <div style="background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #c9a227;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1e3a5f;">${code}</span>
            </div>
            <p>This code expires in <strong>15 minutes</strong>.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Verification email error:', error);
    return false;
  }
}

async function sendVerifiedWelcomeEmail(email, firstName) {
  if (!resend) {
    console.log(`[DEV MODE] Post-verification welcome email for ${email}`);
    return true;
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'Welcome to Office Hours Booking Platform!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎓</div>
            <h1 style="margin: 0; font-size: 24px;">You're All Set, ${firstName}!</h1>
          </div>
          <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #1e3a5f;">Your email has been verified and your account is now active.</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #c9a227;">
              <h3 style="margin: 0 0 12px; color: #1e3a5f;">Getting Started</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
                <li><strong>Browse</strong> available office hours by instructor</li>
                <li><strong>Book</strong> a time slot that works for you</li>
                <li><strong>Get notified</strong> via email about your appointments</li>
                <li><strong>Join waitlists</strong> for fully-booked slots</li>
              </ul>
            </div>
            <p style="color: #555;">If you have any issues, contact us at <a href="mailto:admin@officehourscs370.online" style="color: #2d5a8a;">admin@officehourscs370.online</a>.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/dashboard" style="background: #c9a227; color: #1e3a5f; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
            </div>
            <p style="color: #888; font-size: 12px; text-align: center;">Office Hours Booking Platform — CS 370</p>
          </div>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Post-verification welcome email error:', error);
    return false;
  }
}

async function sendWelcomeEmail(email, firstName, tempPassword) {
  if (!resend) {
    console.log(`[DEV MODE] Welcome email for ${email}, temp password: ${tempPassword}`);
    return true;
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to: email,
      subject: 'Welcome to Office Hours Platform - Your Account Details',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0;">Welcome to Office Hours!</h1>
          </div>
          <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
            <p>Hi ${firstName},</p>
            <p>An account has been created for you on the Office Hours Booking Platform. Here are your temporary credentials:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #c9a227;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 16px;">${tempPassword}</code></p>
            </div>
            <p>When you first log in, you will be required to set a new password and verify your email address.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${APP_URL}/login" style="background: #1e3a5f; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In Now</a>
            </div>
            <p style="color: #888; font-size: 13px;">For security, please change your password immediately after logging in.</p>
          </div>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Welcome email error:', error);
    return false;
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'student', department } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const validRoles = ['student', 'instructor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, department, is_active, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, NOW(), NOW())`,
      [userId, email.toLowerCase(), passwordHash, first_name, last_name, role, department || null]
    );

    await logAction(userId, 'USER_REGISTERED', 'user', userId, { role }, req.ip);

    // Create verification entry
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const code = generateCode();

    await pool.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);
    await pool.query(
      `INSERT INTO email_verifications (id, user_id, verification_token, code, expires_at, created_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes', NOW())`,
      [uuidv4(), userId, verificationToken, code]
    );

    await sendVerificationEmail(email.toLowerCase(), first_name, code);

    res.status(201).json({
      message: 'Registration successful! Please check your email for a verification code.',
      verification_token: verificationToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { verification_token, code } = req.body;

    if (!verification_token || !code) {
      return res.status(400).json({ error: 'Verification token and code are required' });
    }

    const result = await pool.query(
      `SELECT ev.*, u.id as user_id, u.email, u.first_name, u.last_name, u.role, u.department
       FROM email_verifications ev
       JOIN users u ON ev.user_id = u.id
       WHERE ev.verification_token = $1 AND ev.code = $2 AND ev.expires_at > NOW()`,
      [verification_token, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const row = result.rows[0];

    await pool.query(
      'UPDATE users SET is_active = 1, email_verified = 1, updated_at = NOW() WHERE id = $1',
      [row.user_id]
    );

    await pool.query('DELETE FROM email_verifications WHERE user_id = $1', [row.user_id]);

    await logAction(row.user_id, 'EMAIL_VERIFIED', 'user', row.user_id, {}, req.ip);

    // Send welcome email (non-blocking — don't fail verification if email fails)
    sendVerifiedWelcomeEmail(row.email, row.first_name).catch(() => {});

    const token = jwt.sign(
      { userId: row.user_id, email: row.email, role: row.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Email verified successfully',
      user: {
        id: row.user_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        department: row.department
      },
      token
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  try {
    const { verification_token } = req.body;

    if (!verification_token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const result = await pool.query(
      `SELECT ev.*, u.email, u.first_name
       FROM email_verifications ev
       JOIN users u ON ev.user_id = u.id
       WHERE ev.verification_token = $1`,
      [verification_token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const row = result.rows[0];
    const code = generateCode();

    await pool.query(
      `UPDATE email_verifications SET code = $1, expires_at = NOW() + INTERVAL '15 minutes' WHERE verification_token = $2`,
      [code, verification_token]
    );

    await sendVerificationEmail(row.email, row.first_name, code);

    res.json({ message: 'Verification code resent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend code' });
  }
});

// Setup password (for admin-created users)
router.post('/setup-password', async (req, res) => {
  try {
    const { setup_token, new_password } = req.body;

    if (!setup_token || !new_password) {
      return res.status(400).json({ error: 'Setup token and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // setup_token stored in password_resets.reset_token with verified=false, is_setup=true marker via temp_token='setup'
    const resetResult = await pool.query(
      `SELECT pr.*, u.id as user_id, u.email, u.first_name, u.last_name, u.role, u.department, u.email_verified
       FROM password_resets pr
       JOIN users u ON pr.user_id = u.id
       WHERE pr.reset_token = $1 AND pr.temp_token = 'setup' AND pr.expires_at > NOW()`,
      [setup_token]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired setup token' });
    }

    const row = resetResult.rows[0];

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE users SET password = $1, must_change_password = 0, updated_at = NOW() WHERE id = $2',
      [passwordHash, row.user_id]
    );

    await pool.query('DELETE FROM password_resets WHERE id = $1', [row.id]);

    await logAction(row.user_id, 'SETUP_PASSWORD_COMPLETE', 'user', row.user_id, {}, req.ip);

    // If email not verified, trigger verification flow
    if (!row.email_verified) {
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const code = generateCode();

      await pool.query('DELETE FROM email_verifications WHERE user_id = $1', [row.user_id]);
      await pool.query(
        `INSERT INTO email_verifications (id, user_id, verification_token, code, expires_at, created_at)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes', NOW())`,
        [uuidv4(), row.user_id, verificationToken, code]
      );

      // Activate account (since admin created it), but set is_active = 1 and email_verified still 0
      await pool.query(
        'UPDATE users SET is_active = 1, updated_at = NOW() WHERE id = $1',
        [row.user_id]
      );

      await sendVerificationEmail(row.email, row.first_name, code);

      return res.json({
        message: 'Password set. Please verify your email.',
        verification_token: verificationToken
      });
    }

    // Email already verified — issue JWT
    const token = jwt.sign(
      { userId: row.user_id, email: row.email, role: row.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Password set successfully',
      user: {
        id: row.user_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        department: row.department
      },
      token
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, email, password, first_name, last_name, role, department, is_active, email_verified, must_change_password FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      await logAction(null, 'LOGIN_FAILED', 'user', null, { email, reason: 'User not found' }, req.ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password first (always, before revealing account state)
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await logAction(user.id, 'LOGIN_FAILED', 'user', user.id, { reason: 'Invalid password' }, req.ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if email not verified (registered user who hasn't verified)
    if (!user.email_verified) {
      // Regenerate/find verification token
      const existing = await pool.query(
        'SELECT verification_token FROM email_verifications WHERE user_id = $1',
        [user.id]
      );

      let verificationToken;
      if (existing.rows.length > 0) {
        verificationToken = existing.rows[0].verification_token;
      } else {
        verificationToken = crypto.randomBytes(32).toString('hex');
        const code = generateCode();
        await pool.query(
          `INSERT INTO email_verifications (id, user_id, verification_token, code, expires_at, created_at)
           VALUES ($1, $2, $3, $4, NOW() + INTERVAL '15 minutes', NOW())`,
          [uuidv4(), user.id, verificationToken, code]
        );
        await sendVerificationEmail(user.email, user.first_name, code);
      }

      return res.status(403).json({
        error: 'Please verify your email before logging in',
        needs_verification: true,
        verification_token: verificationToken
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact admin@officehourscs370.online for assistance.' });
    }

    // Check if must change password (admin-provisioned user)
    if (user.must_change_password) {
      // Create setup token in password_resets
      const setupToken = crypto.randomBytes(32).toString('hex');
      await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);
      await pool.query(
        `INSERT INTO password_resets (id, user_id, temp_token, reset_token, expires_at, created_at)
         VALUES ($1, $2, 'setup', $3, NOW() + INTERVAL '1 hour', NOW())`,
        [uuidv4(), user.id, setupToken]
      );

      return res.json({
        message: 'Password change required',
        must_change_password: true,
        setup_token: setupToken
      });
    }

    // Normal login
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    await logAction(user.id, 'LOGIN_SUCCESS', 'user', user.id, {}, req.ip);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        department: user.department
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, department,
              email_booking_confirmation, email_booking_reminder, email_cancellation,
              created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, department, email_booking_confirmation, email_booking_reminder, email_cancellation } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        department = COALESCE($3, department),
        email_booking_confirmation = COALESCE($4, email_booking_confirmation),
        email_booking_reminder = COALESCE($5, email_booking_reminder),
        email_cancellation = COALESCE($6, email_cancellation),
        updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, first_name, last_name, role, department`,
      [first_name, last_name, department, email_booking_confirmation, email_booking_reminder, email_cancellation, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAction(req.user.userId, 'PROFILE_UPDATED', 'user', req.user.userId, {}, req.ip);

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(new_password, salt);

    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.userId]
    );

    await logAction(req.user.userId, 'PASSWORD_CHANGED', 'user', req.user.userId, {}, req.ip);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await logAction(req.user.userId, 'LOGOUT', 'user', req.user.userId, {}, req.ip);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
module.exports.sendWelcomeEmail = sendWelcomeEmail;
