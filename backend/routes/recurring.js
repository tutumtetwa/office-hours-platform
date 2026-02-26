const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get patterns
router.get('/', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recurring_patterns WHERE instructor_id = $1 AND is_active = 1 ORDER BY day_of_week',
      [req.user.id]
    );
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns = result.rows.map(p => ({ ...p, day_name: days[p.day_of_week] }));
    res.json({ patterns });
  } catch (error) {
    console.error('Get patterns error:', error);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

// Create pattern
router.post('/', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, location, meeting_type, buffer_minutes, start_date, end_date, slot_duration } = req.body;
    
    console.log('Creating pattern:', req.body);
    
    // Validate required fields
    if (day_of_week === undefined || !start_time || !end_time || !start_date) {
      return res.status(400).json({ error: 'Missing required fields: day_of_week, start_time, end_time, start_date' });
    }
    
    const patternId = uuidv4();
    
    await pool.query(
      `INSERT INTO recurring_patterns 
       (id, instructor_id, day_of_week, start_time, end_time, location, meeting_type, buffer_minutes, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        patternId, 
        req.user.id, 
        parseInt(day_of_week), 
        start_time, 
        end_time, 
        location || null, 
        meeting_type || 'either', 
        buffer_minutes || 0, 
        start_date, 
        end_date || null
      ]
    );
    
    res.status(201).json({ message: 'Pattern created', pattern_id: patternId, slots_created: 0 });
  } catch (error) {
    console.error('Create pattern error:', error);
    res.status(500).json({ error: 'Failed to create pattern: ' + error.message });
  }
});

// Update pattern
router.put('/:id', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { location, meeting_type, buffer_minutes, end_date } = req.body;
    await pool.query(
      'UPDATE recurring_patterns SET location = $1, meeting_type = $2, buffer_minutes = $3, end_date = $4 WHERE id = $5 AND instructor_id = $6',
      [location, meeting_type, buffer_minutes, end_date, req.params.id, req.user.id]
    );
    res.json({ message: 'Pattern updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

// Delete pattern
router.delete('/:id', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    await pool.query('UPDATE recurring_patterns SET is_active = 0 WHERE id = $1 AND instructor_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Pattern deleted', slots_deleted: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pattern' });
  }
});

// Generate slots from pattern
router.post('/:id/generate', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    res.json({ message: 'Slots generated', slots_created: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate slots' });
  }
});

module.exports = router;
