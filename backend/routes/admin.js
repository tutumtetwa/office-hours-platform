const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logAction, getAuditLogs } = require('../utils/logger');

const router = express.Router();

// Get all users (admin only)
router.get('/users', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const { role, department, search } = req.query;

    let query = `
      SELECT id, email, first_name, last_name, role, department, created_at, last_login, is_active
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    if (search) {
      query += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY last_name, first_name';

    const users = db.prepare(query).all(...params);
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, email, first_name, last_name, role, department, created_at, last_login, is_active
      FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user stats
    const appointmentStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as no_show
      FROM appointments
      WHERE student_id = ? OR instructor_id = ?
    `).get(req.params.id, req.params.id);

    res.json({ user, stats: appointmentStats });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user (admin only)
router.post('/users', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, department } = req.body;

    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({ error: 'Email, password, first_name, last_name, and role are required' });
    }

    // Check if email exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    db.prepare(`
      INSERT INTO users (id, email, password, first_name, last_name, role, department)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, email, hashedPassword, first_name, last_name, role, department);

    logAction(req.user.id, 'USER_CREATED_BY_ADMIN', 'user', userId, { email, role }, req);

    res.status(201).json({
      message: 'User created',
      user: { id: userId, email, first_name, last_name, role, department }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, first_name, last_name, role, department, is_active, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const params = [];

    if (email && email !== user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, id);
      if (existing) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      updates.push('email = ?');
      params.push(email);
    }

    if (first_name) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name) { updates.push('last_name = ?'); params.push(last_name); }
    if (role) { updates.push('role = ?'); params.push(role); }
    if (department !== undefined) { updates.push('department = ?'); params.push(department); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    logAction(req.user.id, 'USER_UPDATED_BY_ADMIN', 'user', id, { updated_fields: Object.keys(req.body) }, req);

    const updatedUser = db.prepare('SELECT id, email, first_name, last_name, role, department, is_active FROM users WHERE id = ?').get(id);
    res.json({ message: 'User updated', user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Deactivate user (admin only)
router.post('/users/:id/deactivate', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

    logAction(req.user.id, 'USER_DEACTIVATED', 'user', id, { email: user.email }, req);

    res.json({ message: 'User deactivated' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Reactivate user (admin only)
router.post('/users/:id/reactivate', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    logAction(req.user.id, 'USER_REACTIVATED', 'user', id, { email: user.email }, req);

    res.json({ message: 'User reactivated' });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const { user_id, action, entity_type, start_date, end_date, limit = 100 } = req.query;

    const logs = getAuditLogs({
      userId: user_id,
      action,
      entityType: entity_type,
      startDate: start_date,
      endDate: end_date,
      limit: Math.min(parseInt(limit), 500)
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Get system statistics (admin only)
router.get('/stats', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const userStats = db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END) as students,
        SUM(CASE WHEN role = 'instructor' THEN 1 ELSE 0 END) as instructors,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users
      FROM users
    `).get();

    const appointmentStats = db.prepare(`
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no-show' THEN 1 ELSE 0 END) as no_show
      FROM appointments
    `).get();

    const slotStats = db.prepare(`
      SELECT 
        COUNT(*) as total_slots,
        SUM(CASE WHEN date >= date('now') THEN 1 ELSE 0 END) as future_slots
      FROM availability_slots
    `).get();

    const recentActivity = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `).all();

    res.json({
      users: userStats,
      appointments: appointmentStats,
      slots: slotStats,
      recentActivity
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get departments list
router.get('/departments', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const departments = db.prepare(`
      SELECT DISTINCT department 
      FROM users 
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `).all();

    res.json({ departments: departments.map(d => d.department) });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

module.exports = router;
