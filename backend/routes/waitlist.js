const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/my-waitlist', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, s.date, s.start_time, s.end_time, u.first_name as instructor_first_name, u.last_name as instructor_last_name
      FROM waitlist w
      JOIN availability_slots s ON w.slot_id = s.id
      JOIN users u ON s.instructor_id = u.id
      WHERE w.student_id = $1
      ORDER BY s.date
    `, [req.user.id]);
    res.json({ waitlist_entries: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

router.post('/join', authenticateToken, authorize('student', 'admin'), async (req, res) => {
  try {
    const { slot_id } = req.body;
    const posResult = await pool.query('SELECT MAX(position) as max FROM waitlist WHERE slot_id = $1', [slot_id]);
    const position = (posResult.rows[0].max || 0) + 1;
    
    await pool.query(
      'INSERT INTO waitlist (id, slot_id, student_id, position) VALUES ($1, $2, $3, $4)',
      [uuidv4(), slot_id, req.user.id, position]
    );
    res.status(201).json({ message: 'Added to waitlist', position });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

router.delete('/leave/:slotId', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM waitlist WHERE slot_id = $1 AND student_id = $2', [req.params.slotId, req.user.id]);
    res.json({ message: 'Removed from waitlist' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave waitlist' });
  }
});

module.exports = router;
