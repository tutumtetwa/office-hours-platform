const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get available slots - excludes past slots
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, instructor_id } = req.query;
    
    // Get current date and time in UTC
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
    
    let query = `
      SELECT s.*, 
        u.first_name, u.last_name, u.department,
        CASE WHEN EXISTS (
          SELECT 1 FROM appointments a 
          WHERE a.slot_id = s.id AND a.status = 'scheduled'
        ) THEN true ELSE false END as is_booked,
        (
          SELECT a.student_id FROM appointments a 
          WHERE a.slot_id = s.id AND a.status = 'scheduled' LIMIT 1
        ) as booked_by_student_id
      FROM availability_slots s
      JOIN users u ON s.instructor_id = u.id
      WHERE (
        s.date > $1 
        OR (s.date = $1 AND s.start_time > $2)
      )
    `;
    const params = [currentDate, currentTime];
    
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
      id: s.id,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      location: s.location,
      meeting_type: s.meeting_type,
      notes: s.notes,
      instructor_id: s.instructor_id,
      is_booked: s.is_booked,
      is_my_booking: s.booked_by_student_id === req.user.id,
      instructor: { 
        id: s.instructor_id, 
        first_name: s.first_name, 
        last_name: s.last_name, 
        department: s.department 
      }
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
    const result = await pool.query("SELECT id, first_name, last_name, department FROM users WHERE role = 'instructor' AND is_active = 1 ORDER BY last_name");
    res.json({ instructors: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
});

// Get my slots (instructor) - shows all future slots including today's past times for management
router.get('/my-slots', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    
    const result = await pool.query(`
      SELECT s.*,
        CASE WHEN EXISTS (
          SELECT 1 FROM appointments a WHERE a.slot_id = s.id AND a.status = 'scheduled'
        ) THEN true ELSE false END as is_booked,
        CASE WHEN s.date < $1 OR (s.date = $1 AND s.start_time <= $2) THEN true ELSE false END as is_past
      FROM availability_slots s 
      WHERE s.instructor_id = $3 AND s.date >= $1
      ORDER BY s.date, s.start_time
    `, [currentDate, currentTime, req.user.id]);
    res.json({ slots: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Create slot
router.post('/', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { date, start_time, end_time, location, meeting_type, notes } = req.body;
    
    // Validate not in the past
    const now = new Date();
    const slotDateTime = new Date(`${date}T${start_time}`);
    if (slotDateTime <= now) {
      return res.status(400).json({ error: 'Cannot create slots in the past' });
    }
    
    const slotId = uuidv4();
    
    await pool.query(
      'INSERT INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
      [slotId, req.user.id, date, start_time, end_time, location, meeting_type || 'either', notes]
    );
    
    res.status(201).json({ message: 'Slot created', slot_id: slotId });
  } catch (error) {
    console.error('Create slot error:', error);
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

// Create bulk slots
router.post('/bulk', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { slots } = req.body;
    let created = 0;
    const now = new Date();
    
    for (const slot of slots) {
      const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
      if (slotDateTime > now) {
        const slotId = uuidv4();
        await pool.query(
          'INSERT INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [slotId, req.user.id, slot.date, slot.start_time, slot.end_time, slot.location, slot.meeting_type || 'either']
        );
        created++;
      }
    }
    
    res.status(201).json({ message: `${created} slots created`, slots_created: created });
  } catch (error) {
    console.error('Bulk create error:', error);
    res.status(500).json({ error: 'Failed to create slots' });
  }
});

// Delete slot
router.delete('/:id', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    // Check if slot has appointments
    const hasAppointments = await pool.query(
      "SELECT id FROM appointments WHERE slot_id = $1 AND status = 'scheduled'",
      [req.params.id]
    );
    
    if (hasAppointments.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete slot with active appointments' });
    }
    
    await pool.query('DELETE FROM availability_slots WHERE id = $1 AND instructor_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Slot deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

module.exports = router;
