const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Get my appointments
router.get('/my-appointments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email, i.department as instructor_department,
        s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email
      FROM appointments a
      JOIN users i ON a.instructor_id = i.id
      JOIN users s ON a.student_id = s.id
      WHERE (a.student_id = $1 OR a.instructor_id = $1)
      ORDER BY a.date, a.start_time
    `, [req.user.id]);
    
    const appointments = result.rows.map(a => ({
      id: a.id, date: a.date, start_time: a.start_time, end_time: a.end_time,
      status: a.status, meeting_type: a.meeting_type, location: a.location, topic: a.topic,
      instructor: { id: a.instructor_id, first_name: a.instructor_first_name, last_name: a.instructor_last_name },
      student: { id: a.student_id, first_name: a.student_first_name, last_name: a.student_last_name },
      is_instructor: a.instructor_id === req.user.id
    }));
    
    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Book appointment
router.post('/book', authenticateToken, authorize('student', 'admin'), async (req, res) => {
  try {
    const { slot_id, meeting_type, topic, notes } = req.body;
    
    const slotResult = await pool.query('SELECT * FROM availability_slots WHERE id = $1', [slot_id]);
    const slot = slotResult.rows[0];
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    
    const existingResult = await pool.query("SELECT id FROM appointments WHERE slot_id = $1 AND status = 'scheduled'", [slot_id]);
    if (existingResult.rows.length > 0) return res.status(409).json({ error: 'Slot already booked' });
    
    const appointmentId = uuidv4();
    await pool.query(
      'INSERT INTO appointments (id, slot_id, student_id, instructor_id, date, start_time, end_time, meeting_type, location, topic, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [appointmentId, slot_id, req.user.id, slot.instructor_id, slot.date, slot.start_time, slot.end_time, meeting_type, slot.location, topic, notes]
    );
    
    res.status(201).json({ message: 'Appointment booked', appointment: { id: appointmentId } });
  } catch (error) {
    console.error('Book error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Cancel appointment
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query(
      "UPDATE appointments SET status = 'cancelled', cancelled_by = $1, cancellation_reason = $2, cancelled_at = NOW() WHERE id = $3",
      [req.user.id, reason, req.params.id]
    );
    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Complete appointment
router.post('/:id/complete', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Appointment updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

module.exports = router;
