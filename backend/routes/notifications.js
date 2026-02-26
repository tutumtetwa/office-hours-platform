const express = require('express');
const { pool } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unread = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0',
      [req.user.id]
    );
    res.json({ notifications: result.rows, unread_count: parseInt(unread.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

module.exports = router;
