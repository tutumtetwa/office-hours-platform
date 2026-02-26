const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');
const { authenticateToken, JWT_SECRET, SESSION_TIMEOUT } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../utils/validators');
const { logAction } = require('../utils/logger');

const router = express.Router();

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'student', department } = req.body;

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      logAction(null, 'REGISTRATION_FAILED', 'user', null, { email, reason: 'Email already exists' }, req);
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, department)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, hashedPassword, first_name, last_name, role, department);

    logAction(userId, 'USER_REGISTERED', 'user', userId, { email, role }, req);

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: userId,
        email,
        first_name,
        last_name,
        role,
        department
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email);
    if (!user) {
      logAction(null, 'LOGIN_FAILED', 'user', null, { email, reason: 'User not found' }, req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      logAction(user.id, 'LOGIN_FAILED', 'user', user.id, { reason: 'Invalid password' }, req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT).toISOString();
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, user.id, token, expiresAt);

    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    logAction(user.id, 'LOGIN_SUCCESS', 'user', user.id, { email }, req);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    // Delete session
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    
    logAction(req.user.id, 'LOGOUT', 'user', req.user.id, {}, req);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Update password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user with password
    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    
    // Verify current password
    const validPassword = await bcrypt.compare(current_password, user.password);
    if (!validPassword) {
      logAction(req.user.id, 'PASSWORD_CHANGE_FAILED', 'user', req.user.id, { reason: 'Invalid current password' }, req);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(new_password, 12);
    db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(hashedPassword, req.user.id);

    // Invalidate all other sessions
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(req.user.id, req.token);

    logAction(req.user.id, 'PASSWORD_CHANGED', 'user', req.user.id, {}, req);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Password update failed' });
  }
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { first_name, last_name, department } = req.body;

    const updates = [];
    const params = [];

    if (first_name) {
      updates.push('first_name = ?');
      params.push(first_name.trim());
    }
    if (last_name) {
      updates.push('last_name = ?');
      params.push(last_name.trim());
    }
    if (department !== undefined) {
      updates.push('department = ?');
      params.push(department ? department.trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.user.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updatedUser = db.prepare('SELECT id, email, first_name, last_name, role, department FROM users WHERE id = ?')
      .get(req.user.id);

    logAction(req.user.id, 'PROFILE_UPDATED', 'user', req.user.id, { updated_fields: Object.keys(req.body) }, req);

    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

module.exports = router;
