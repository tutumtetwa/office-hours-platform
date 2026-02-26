const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper to get real IP
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         req.ip || 
         'unknown';
}

// Helper to log actions
async function logAction(userId, action, details = {}, req = null) {
  try {
    const ip = req ? getClientIP(req) : 'unknown';
    await pool.query(
      'INSERT INTO audit_logs (id, user_id, action, details, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [
        uuidv4(),
        userId,
        action,
        JSON.stringify(details),
        ip,
        req?.headers?.['user-agent']?.substring(0, 200) || 'unknown'
      ]
    );
  } catch (e) {
    console.error('Failed to log action:', e);
  }
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role = 'student', department } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = uuidv4();

    await pool.query(
      'INSERT INTO users (id, email, password, first_name, last_name, role, department, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())',
      [userId, email, hashedPassword, first_name, last_name, role, department]
    );

    await logAction(userId, 'USER_REGISTERED', { email, role }, req);

    const token = jwt.sign({ id: userId, email, role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, email, first_name, last_name, role, department }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      await logAction(null, 'LOGIN_FAILED', { email, reason: 'Invalid credentials' }, req);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      await logAction(user.id, 'LOGIN_FAILED', { reason: 'Account deactivated' }, req);
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    await logAction(user.id, 'LOGIN_SUCCESS', { email: user.email }, req);

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

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, department } = req.body;
    
    await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, department = $3, updated_at = NOW() WHERE id = $4',
      [first_name, last_name, department, req.user.id]
    );

    await logAction(req.user.id, 'PROFILE_UPDATED', { first_name, last_name, department }, req);
    res.json({ message: 'Profile updated' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const result = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];

    if (!bcrypt.compareSync(current_password, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = bcrypt.hashSync(new_password, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, req.user.id]);

    await logAction(req.user.id, 'PASSWORD_CHANGED', {}, req);
    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  await logAction(req.user.id, 'LOGOUT', {}, req);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
