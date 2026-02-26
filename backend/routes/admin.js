const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all users
router.get('/users', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department, is_active, created_at FROM users ORDER BY created_at DESC'
    );
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
    
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const userId = uuidv4();
    
    await pool.query(
      'INSERT INTO users (id, email, password, first_name, last_name, role, department) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, email, hashedPassword, first_name, last_name, role || 'student', department]
    );
    
    res.status(201).json({ message: 'User created', user: { id: userId, email, first_name, last_name, role } });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get single user
router.get('/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department, is_active FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
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

// Get stats - Returns ALL possible field names for compatibility
router.get('/stats', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*)::int as count FROM users');
    const students = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'student'");
    const instructors = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'instructor'");
    const admins = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE role = 'admin'");
    const activeUsers = await pool.query("SELECT COUNT(*)::int as count FROM users WHERE is_active = 1");
    const totalAppointments = await pool.query('SELECT COUNT(*)::int as count FROM appointments');
    const completedAppointments = await pool.query("SELECT COUNT(*)::int as count FROM appointments WHERE status = 'completed'");
    const cancelledAppointments = await pool.query("SELECT COUNT(*)::int as count FROM appointments WHERE status = 'cancelled'");
    
    // Return with multiple field name formats for frontend compatibility
    const stats = {
      // snake_case
      total_users: totalUsers.rows[0].count,
      total_students: students.rows[0].count,
      total_instructors: instructors.rows[0].count,
      total_admins: admins.rows[0].count,
      active_users: activeUsers.rows[0].count,
      total_appointments: totalAppointments.rows[0].count,
      completed_appointments: completedAppointments.rows[0].count,
      cancelled_appointments: cancelledAppointments.rows[0].count,
      // camelCase
      totalUsers: totalUsers.rows[0].count,
      totalStudents: students.rows[0].count,
      totalInstructors: instructors.rows[0].count,
      totalAdmins: admins.rows[0].count,
      activeUsers: activeUsers.rows[0].count,
      totalAppointments: totalAppointments.rows[0].count,
      completedAppointments: completedAppointments.rows[0].count,
      cancelledAppointments: cancelledAppointments.rows[0].count,
      // Simple names
      users: totalUsers.rows[0].count,
      students: students.rows[0].count,
      instructors: instructors.rows[0].count,
      admins: admins.rows[0].count,
      appointments: totalAppointments.rows[0].count,
      completed: completedAppointments.rows[0].count,
      cancelled: cancelledAppointments.rows[0].count
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get audit logs
router.get('/audit-logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, u.first_name, u.last_name, u.email 
      FROM audit_logs al 
      LEFT JOIN users u ON al.user_id = u.id 
      ORDER BY al.created_at DESC 
      LIMIT 100
    `);
    res.json({ logs: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get departments
router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT department FROM users WHERE department IS NOT NULL');
    res.json({ departments: result.rows.map(r => r.department) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
