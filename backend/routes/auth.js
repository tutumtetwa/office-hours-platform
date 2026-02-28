const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { logAction } = require('../utils/logger');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'student', department } = req.body;

    // Validation
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate role
    const validRoles = ['student', 'instructor'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user (no phone_number field)
    const result = await pool.query(
      `INSERT INTO users (id, email, password, first_name, last_name, role, department, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, department, created_at`,
      [uuidv4(), email.toLowerCase(), passwordHash, first_name, last_name, role, department || null]
    );

    const user = result.rows[0];

    // Log registration
    await logAction(user.id, 'USER_REGISTERED', 'user', user.id, { role }, req.ip);

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password, first_name, last_name, role, department, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      await logAction(null, 'LOGIN_FAILED', 'user', null, { email, reason: 'User not found' }, req.ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      await logAction(user.id, 'LOGIN_FAILED', 'user', user.id, { reason: 'Invalid password' }, req.ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Log success
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

    // Get current password hash
    const userResult = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(new_password, salt);

    // Update password
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

// Logout (optional - for logging)
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
