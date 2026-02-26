const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/users', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT id, email, first_name, last_name, role, department, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create user
router.post('/users', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, department } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    
    await pool.query(
      'INSERT INTO users (id, email, password, first_name, last_name, role, department) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, email, hashedPassword, first_name, last_name, role, department]
    );
    
    res.status(201).json({ message: 'User created', user: { id: userId, email, first_name, last_name, role } });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { first_name, last_name, role, department } = req.body;
    await pool.query(
      'UPDATE users SET first_name = $1, last_name = $2, role = $3, department = $4, updated_at = NOW() WHERE id = $5',
      [first_name, last_name, role, department, req.params.id]
    );
    res.json({ message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Deactivate user
router.post('/users/:id/deactivate', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = 0 WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reactivate user
router.post('/users/:id/reactivate', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = 1 WHERE id = $1', [req.params.id]);
    res.json({ message: 'User reactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// Get stats
router.get('/stats', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) as count FROM users');
    const appointments = await pool.query('SELECT COUNT(*) as count FROM appointments');
    const today = await pool.query("SELECT COUNT(*) as count FROM appointments WHERE date = CURRENT_DATE");
    res.json({
      total_users: parseInt(users.rows[0].count),
      total_appointments: parseInt(appointments.rows[0].count),
      today_appointments: parseInt(today.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get audit logs
router.get('/audit-logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json({ logs: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
