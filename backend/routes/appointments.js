const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to log actions
async function logAction(userId, action, details = {}, req = null) {
  try {
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || 'unknown';
    await pool.query(
      'INSERT INTO audit_logs (id, user_id, action, details, ip_address, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [uuidv4(), userId, action, JSON.stringify(details), ip]
    );
  } catch (e) { console.error('Log error:', e); }
}

// Helper to create notification
async function createNotification(userId, type, title, message) {
  try {
    await pool.query(
      'INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [uuidv4(), userId, type, title, message]
    );
  } catch (e) { console.error('Notification error:', e); }
}

// Get my appointments
router.get('/my-appointments', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, 
        i.email as instructor_email, i.department as instructor_department,
        s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email
      FROM appointments a
      JOIN users i ON a.instructor_id = i.id
      JOIN users s ON a.student_id = s.id
      WHERE (a.student_id = $1 OR a.instructor_id = $1)
      ORDER BY a.date DESC, a.start_time DESC
    `, [req.user.id]);
    
    const appointments = result.rows.map(a => ({
      id: a.id, 
      date: a.date, 
      start_time: a.start_time, 
      end_time: a.end_time,
      status: a.status, 
      meeting_type: a.meeting_type, 
      location: a.location, 
      topic: a.topic,
      notes: a.notes,
      created_at: a.created_at,
      cancelled_at: a.cancelled_at,
      cancellation_reason: a.cancellation_reason,
      instructor: { id: a.instructor_id, first_name: a.instructor_first_name, last_name: a.instructor_last_name, email: a.instructor_email, department: a.instructor_department },
      student: { id: a.student_id, first_name: a.student_first_name, last_name: a.student_last_name, email: a.student_email },
      is_instructor: a.instructor_id === req.user.id
    }));
    
    res.json({ appointments });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get single appointment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, 
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email,
        s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email
      FROM appointments a
      JOIN users i ON a.instructor_id = i.id
      JOIN users s ON a.student_id = s.id
      WHERE a.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    const a = result.rows[0];
    res.json({ 
      appointment: {
        id: a.id, date: a.date, start_time: a.start_time, end_time: a.end_time,
        status: a.status, meeting_type: a.meeting_type, location: a.location, 
        topic: a.topic, notes: a.notes, created_at: a.created_at,
        instructor: { id: a.instructor_id, first_name: a.instructor_first_name, last_name: a.instructor_last_name },
        student: { id: a.student_id, first_name: a.student_first_name, last_name: a.student_last_name }
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Book appointment
router.post('/book', authenticateToken, authorize('student', 'admin'), async (req, res) => {
  try {
    const { slot_id, meeting_type, topic, notes } = req.body;
    
    // Get slot with instructor info
    const slotResult = await pool.query(`
      SELECT s.*, u.first_name, u.last_name 
      FROM availability_slots s 
      JOIN users u ON s.instructor_id = u.id
      WHERE s.id = $1
    `, [slot_id]);
    
    if (slotResult.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    const slot = slotResult.rows[0];
    
    // Check if slot is in the past
    const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
    if (slotDateTime <= new Date()) {
      return res.status(400).json({ error: 'Cannot book past slots' });
    }
    
    // Check if already booked
    const existingResult = await pool.query(
      "SELECT id FROM appointments WHERE slot_id = $1 AND status = 'scheduled'", 
      [slot_id]
    );
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'Slot already booked' });
    }
    
    // Check for conflicting appointments
    const conflictResult = await pool.query(`
      SELECT id FROM appointments 
      WHERE student_id = $1 AND date = $2 AND status = 'scheduled'
      AND ((start_time <= $3 AND end_time > $3) OR (start_time < $4 AND end_time >= $4) OR (start_time >= $3 AND end_time <= $4))
    `, [req.user.id, slot.date, slot.start_time, slot.end_time]);
    
    if (conflictResult.rows.length > 0) {
      return res.status(409).json({ error: 'You have a conflicting appointment at this time' });
    }
    
    const appointmentId = uuidv4();
    await pool.query(
      'INSERT INTO appointments (id, slot_id, student_id, instructor_id, date, start_time, end_time, meeting_type, location, topic, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())',
      [appointmentId, slot_id, req.user.id, slot.instructor_id, slot.date, slot.start_time, slot.end_time, meeting_type, slot.location, topic, notes]
    );
    
    // Remove student from waitlist if they were on it
    await pool.query('DELETE FROM waitlist WHERE slot_id = $1 AND student_id = $2', [slot_id, req.user.id]);
    
    // Get student info for notification
    const studentResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [req.user.id]);
    const student = studentResult.rows[0];
    
    // Notify instructor
    const formattedDate = new Date(slot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    await createNotification(
      slot.instructor_id,
      'new_booking',
      'New Appointment Booked',
      `${student.first_name} ${student.last_name} booked an appointment with you on ${formattedDate} at ${slot.start_time}.`
    );
    
    // Notify student (confirmation)
    await createNotification(
      req.user.id,
      'booking_confirmed',
      'Booking Confirmed',
      `Your appointment with ${slot.first_name} ${slot.last_name} on ${formattedDate} at ${slot.start_time} has been confirmed.`
    );
    
    await logAction(req.user.id, 'APPOINTMENT_BOOKED', { appointment_id: appointmentId, instructor_id: slot.instructor_id, date: slot.date }, req);
    
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
    
    // Get appointment details
    const aptResult = await pool.query(`
      SELECT a.*, 
        i.first_name as instructor_first_name, i.last_name as instructor_last_name,
        s.first_name as student_first_name, s.last_name as student_last_name
      FROM appointments a
      JOIN users i ON a.instructor_id = i.id
      JOIN users s ON a.student_id = s.id
      WHERE a.id = $1 AND a.status = 'scheduled'
    `, [req.params.id]);
    
    if (aptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found or already cancelled' });
    }
    
    const apt = aptResult.rows[0];
    
    // Check permission
    if (apt.student_id !== req.user.id && apt.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
    }
    
    // Cancel the appointment
    await pool.query(
      "UPDATE appointments SET status = 'cancelled', cancelled_by = $1, cancellation_reason = $2, cancelled_at = NOW() WHERE id = $3",
      [req.user.id, reason, req.params.id]
    );
    
    const formattedDate = new Date(apt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const cancelledBy = req.user.id === apt.student_id ? 'student' : 'instructor';
    
    // Notify the other party
    if (cancelledBy === 'student') {
      await createNotification(
        apt.instructor_id,
        'booking_cancelled',
        'Appointment Cancelled',
        `${apt.student_first_name} ${apt.student_last_name} cancelled their appointment on ${formattedDate} at ${apt.start_time}. Reason: ${reason || 'Not specified'}`
      );
    } else {
      await createNotification(
        apt.student_id,
        'booking_cancelled',
        'Appointment Cancelled',
        `${apt.instructor_first_name} ${apt.instructor_last_name} cancelled your appointment on ${formattedDate} at ${apt.start_time}. Reason: ${reason || 'Not specified'}`
      );
    }
    
    // NOTIFY WAITLIST - Important!
    try {
      const waitlistRoute = require('./waitlist');
      if (waitlistRoute.notifyNextOnWaitlist) {
        await waitlistRoute.notifyNextOnWaitlist(apt.slot_id);
      }
    } catch (e) {
      console.error('Waitlist notify error:', e);
    }
    
    await logAction(req.user.id, 'APPOINTMENT_CANCELLED', { appointment_id: req.params.id, reason }, req);
    
    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Complete appointment
router.post('/:id/complete', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body; // 'completed' or 'no-show'
    
    if (!['completed', 'no-show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use "completed" or "no-show"' });
    }
    
    await pool.query('UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    await logAction(req.user.id, `APPOINTMENT_${status.toUpperCase().replace('-', '_')}`, { appointment_id: req.params.id }, req);
    
    res.json({ message: `Appointment marked as ${status}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { topic, notes, meeting_link } = req.body;
    await pool.query(
      'UPDATE appointments SET topic = COALESCE($1, topic), notes = COALESCE($2, notes), meeting_link = COALESCE($3, meeting_link), updated_at = NOW() WHERE id = $4',
      [topic, notes, meeting_link, req.params.id]
    );
    res.json({ message: 'Appointment updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

module.exports = router;