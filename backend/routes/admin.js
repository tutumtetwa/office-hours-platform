const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to log actions
async function logAction(userId, action, details = {}, req = null) {
  try {
    await pool.query(
      'INSERT INTO audit_logs (id, user_id, action, details, ip_address, user_agent, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [
        uuidv4(),
        userId,
        action,
        JSON.stringify(details),
        req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
        req?.headers?.['user-agent']?.substring(0, 200) || 'unknown'
      ]
    );
  } catch (e) {
    console.error('Failed to log action:', e);
  }
}

// Get all users
router.get('/users', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, department, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    await logAction(req.user.id, 'VIEW_USERS', {}, req);
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
    
    await logAction(req.user.id, 'USER_CREATED', { created_user_id: userId, email, role }, req);
    
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
      'SELECT id, email, first_name, last_name, role, department, is_active, last_login FROM users WHERE id = $1',
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
    await logAction(req.user.id, 'USER_UPDATED', { updated_user_id: req.params.id, first_name, last_name, role }, req);
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Deactivate user
router.post('/users/:id/deactivate', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = $1', [req.params.id]);
    await logAction(req.user.id, 'USER_DEACTIVATED', { deactivated_user_id: req.params.id }, req);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reactivate user
router.post('/users/:id/reactivate', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = 1, updated_at = NOW() WHERE id = $1', [req.params.id]);
    await logAction(req.user.id, 'USER_REACTIVATED', { reactivated_user_id: req.params.id }, req);
    res.json({ message: 'User reactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// Get stats
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
    
    res.json({
      total_users: totalUsers.rows[0].count,
      total_students: students.rows[0].count,
      total_instructors: instructors.rows[0].count,
      total_admins: admins.rows[0].count,
      active_users: activeUsers.rows[0].count,
      total_appointments: totalAppointments.rows[0].count,
      completed_appointments: completedAppointments.rows[0].count,
      cancelled_appointments: cancelledAppointments.rows[0].count,
      totalUsers: totalUsers.rows[0].count,
      students: students.rows[0].count,
      instructors: instructors.rows[0].count,
      admins: admins.rows[0].count,
      activeUsers: activeUsers.rows[0].count,
      appointments: totalAppointments.rows[0].count,
      completed: completedAppointments.rows[0].count,
      cancelled: cancelledAppointments.rows[0].count
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get audit logs - FIXED to show user names properly
router.get('/audit-logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { action, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        al.id,
        al.action,
        al.details,
        al.ip_address,
        al.created_at,
        al.user_id,
        COALESCE(u.first_name || ' ' || u.last_name, 'System') as user_name,
        COALESCE(u.email, 'system') as user_email
      FROM audit_logs al 
      LEFT JOIN users u ON al.user_id = u.id 
    `;
    
    const params = [];
    if (action && action !== 'All Actions') {
      params.push(action);
      query += ` WHERE al.action = $${params.length}`;
    }
    
    params.push(parseInt(limit) || 100);
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;
    
    const result = await pool.query(query, params);
    
    const logs = result.rows.map(log => ({
      id: log.id,
      action: log.action,
      details: log.details,
      ip_address: log.ip_address,
      created_at: log.created_at,
      user_id: log.user_id,
      user_name: log.user_name,
      user_email: log.user_email,
      // For frontend compatibility
      first_name: log.user_name?.split(' ')[0],
      last_name: log.user_name?.split(' ')[1],
      email: log.user_email
    }));
    
    res.json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
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
