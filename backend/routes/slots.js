const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get available slots
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, instructor_id } = req.query;
    let query = `
      SELECT s.*, u.first_name, u.last_name, u.department,
        (SELECT COUNT(*) FROM appointments a WHERE a.slot_id = s.id AND a.status = 'scheduled') as is_booked
      FROM availability_slots s
      JOIN users u ON s.instructor_id = u.id
      WHERE s.date >= CURRENT_DATE
    `;
    const params = [];
    
    if (date) {
      params.push(date);
      query += ` AND s.date = $${params.length}`;
    }
    if (instructor_id) {
      params.push(instructor_id);
      query += ` AND s.instructor_id = $${params.length}`;
    }
    
    query += ' ORDER BY s.date, s.start_time';
    
    const result = await pool.query(query, params);
    const slots = result.rows.map(s => ({
      ...s,
      is_booked: parseInt(s.is_booked) > 0,
      instructor: { id: s.instructor_id, first_name: s.first_name, last_name: s.last_name, department: s.department }
    }));
    
    res.json({ slots });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Get instructors
router.get('/instructors', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT id, first_name, last_name, department FROM users WHERE role = 'instructor' AND is_active = 1");
    res.json({ instructors: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
});

// Get my slots (instructor)
router.get('/my-slots', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM availability_slots WHERE instructor_id = $1 AND date >= CURRENT_DATE ORDER BY date, start_time',
      [req.user.id]
    );
    res.json({ slots: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Create slot
router.post('/', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { date, start_time, end_time, location, meeting_type } = req.body;
    const slotId = uuidv4();
    
    await pool.query(
      'INSERT INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [slotId, req.user.id, date, start_time, end_time, location, meeting_type || 'either']
    );
    
    res.status(201).json({ message: 'Slot created', slot_id: slotId });
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

// Delete slot
router.delete('/:id', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM availability_slots WHERE id = $1 AND instructor_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Slot deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

module.exports = router;
