const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateBooking, validateCancellation, validateDateRange } = require('../utils/validators');
const { logAction } = require('../utils/logger');
const emailService = require('../utils/emailService');
const { notifyBookingConfirmed, notifyNewBooking, notifyBookingCancelled } = require('../utils/notificationService');
const { format } = require('date-fns');

const router = express.Router();

// Get my appointments
router.get('/my-appointments', authenticateToken, validateDateRange, (req, res) => {
  try {
    const { status, start_date, end_date, upcoming_only } = req.query;
    let query = `
      SELECT a.*, s.location as slot_location, s.notes as slot_notes,
        i.first_name as instructor_first_name, i.last_name as instructor_last_name,
        i.email as instructor_email, i.department as instructor_department,
        st.first_name as student_first_name, st.last_name as student_last_name, st.email as student_email
      FROM appointments a
      JOIN availability_slots s ON a.slot_id = s.id
      JOIN users i ON a.instructor_id = i.id
      JOIN users st ON a.student_id = st.id
      WHERE (a.student_id = ? OR a.instructor_id = ?)
    `;
    const params = [req.user.id, req.user.id];
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    if (start_date) { query += ' AND a.date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND a.date <= ?'; params.push(end_date); }
    if (upcoming_only === 'true') { query += " AND a.date >= date('now') AND a.status = 'scheduled'"; }
    query += ' ORDER BY a.date, a.start_time';

    const appointments = db.prepare(query).all(...params);
    const transformed = appointments.map(apt => ({
      id: apt.id, date: apt.date, start_time: apt.start_time, end_time: apt.end_time,
      status: apt.status, meeting_type: apt.meeting_type, location: apt.location || apt.slot_location,
      meeting_link: apt.meeting_link, topic: apt.topic, notes: apt.notes,
      instructor: { id: apt.instructor_id, first_name: apt.instructor_first_name, last_name: apt.instructor_last_name, email: apt.instructor_email, department: apt.instructor_department },
      student: { id: apt.student_id, first_name: apt.student_first_name, last_name: apt.student_last_name, email: apt.student_email },
      is_instructor: apt.instructor_id === req.user.id,
      cancelled_at: apt.cancelled_at, cancellation_reason: apt.cancellation_reason, created_at: apt.created_at
    }));
    res.json({ appointments: transformed });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get appointment by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const appointment = db.prepare(`
      SELECT a.*, s.location as slot_location,
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email, i.department as instructor_department,
        st.first_name as student_first_name, st.last_name as student_last_name, st.email as student_email
      FROM appointments a
      JOIN availability_slots s ON a.slot_id = s.id
      JOIN users i ON a.instructor_id = i.id
      JOIN users st ON a.student_id = st.id
      WHERE a.id = ?
    `).get(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.student_id !== req.user.id && appointment.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ appointment: {
      id: appointment.id, date: appointment.date, start_time: appointment.start_time, end_time: appointment.end_time,
      status: appointment.status, meeting_type: appointment.meeting_type, location: appointment.location || appointment.slot_location,
      meeting_link: appointment.meeting_link, topic: appointment.topic, notes: appointment.notes,
      instructor: { id: appointment.instructor_id, first_name: appointment.instructor_first_name, last_name: appointment.instructor_last_name, email: appointment.instructor_email, department: appointment.instructor_department },
      student: { id: appointment.student_id, first_name: appointment.student_first_name, last_name: appointment.student_last_name, email: appointment.student_email },
      cancelled_at: appointment.cancelled_at, cancellation_reason: appointment.cancellation_reason, created_at: appointment.created_at
    }});
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Book appointment
router.post('/book', authenticateToken, authorize('student', 'admin'), validateBooking, (req, res) => {
  try {
    const { slot_id, meeting_type, topic, notes } = req.body;
    const slot = db.prepare(`
      SELECT s.*, u.first_name, u.last_name, u.email
      FROM availability_slots s JOIN users u ON s.instructor_id = u.id WHERE s.id = ?
    `).get(slot_id);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    const slotDateTime = new Date(slot.date + 'T' + slot.start_time);
    if (slotDateTime <= new Date()) return res.status(400).json({ error: 'Cannot book past slots' });
    if (slot.meeting_type !== 'either' && slot.meeting_type !== meeting_type) {
      return res.status(400).json({ error: 'This slot only allows ' + slot.meeting_type + ' meetings' });
    }

    const existingBooking = db.prepare("SELECT id FROM appointments WHERE slot_id = ? AND status = 'scheduled'").get(slot_id);
    if (existingBooking) return res.status(409).json({ error: 'This slot is already booked' });

    const overlapping = db.prepare(`
      SELECT id FROM appointments WHERE student_id = ? AND date = ? AND status = 'scheduled'
      AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
    `).get(req.user.id, slot.date, slot.end_time, slot.start_time, slot.end_time, slot.start_time, slot.start_time, slot.end_time);
    if (overlapping) return res.status(409).json({ error: 'You have an overlapping appointment' });

    const appointmentId = uuidv4();
    db.prepare(`
      INSERT INTO appointments (id, slot_id, student_id, instructor_id, date, start_time, end_time, meeting_type, location, topic, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appointmentId, slot_id, req.user.id, slot.instructor_id, slot.date, slot.start_time, slot.end_time, meeting_type, meeting_type === 'in-person' ? slot.location : null, topic, notes);

    logAction(req.user.id, 'APPOINTMENT_BOOKED', 'appointment', appointmentId, { slot_id, instructor_id: slot.instructor_id, date: slot.date }, req);

    const student = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const instructor = { first_name: slot.first_name, last_name: slot.last_name, email: slot.email };
    const appointmentData = { id: appointmentId, date: slot.date, start_time: slot.start_time, end_time: slot.end_time, meeting_type, location: slot.location, topic };

    emailService.sendBookingConfirmation(appointmentData, student, instructor).catch(console.error);
    
    const dateFormatted = format(new Date(slot.date), 'MMM d');
    notifyBookingConfirmed(req.user.id, instructor.first_name + ' ' + instructor.last_name, dateFormatted, slot.start_time);
    notifyNewBooking(slot.instructor_id, student.first_name + ' ' + student.last_name, dateFormatted, slot.start_time);

    res.status(201).json({ message: 'Appointment booked successfully', appointment: { id: appointmentId, date: slot.date, start_time: slot.start_time, end_time: slot.end_time, meeting_type, location: slot.location, topic } });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});

// Cancel appointment
router.post('/:id/cancel', authenticateToken, validateCancellation, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = db.prepare(`
      SELECT a.*, s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email,
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users i ON a.instructor_id = i.id
      WHERE a.id = ? AND a.status = 'scheduled'
    `).get(id);

    if (!appointment) return res.status(404).json({ error: 'Appointment not found or already cancelled' });
    if (appointment.student_id !== req.user.id && appointment.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
    }

    const appointmentDateTime = new Date(appointment.date + 'T' + appointment.start_time);
    if (appointmentDateTime <= new Date()) return res.status(400).json({ error: 'Cannot cancel past appointments' });

    db.prepare("UPDATE appointments SET status = 'cancelled', cancelled_by = ?, cancellation_reason = ?, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.user.id, reason, id);
    logAction(req.user.id, 'APPOINTMENT_CANCELLED', 'appointment', id, { cancelled_by_role: req.user.role, reason }, req);

    const student = { first_name: appointment.student_first_name, last_name: appointment.student_last_name, email: appointment.student_email };
    const instructor = { first_name: appointment.instructor_first_name, last_name: appointment.instructor_last_name, email: appointment.instructor_email };
    const cancelledByRole = req.user.id === appointment.student_id ? 'student' : 'instructor';
    
    emailService.sendCancellationNotification(appointment, student, instructor, cancelledByRole, reason).catch(console.error);

    const dateFormatted = format(new Date(appointment.date), 'MMM d');
    const isStudentCancelling = req.user.id === appointment.student_id;
    notifyBookingCancelled(appointment.student_id, instructor.first_name + ' ' + instructor.last_name, dateFormatted, appointment.start_time, !isStudentCancelling);
    notifyBookingCancelled(appointment.instructor_id, student.first_name + ' ' + student.last_name, dateFormatted, appointment.start_time, isStudentCancelling);

    try {
      const { notifyNextOnWaitlist } = require('./waitlist');
      await notifyNextOnWaitlist(appointment.slot_id);
    } catch (e) { console.error('Waitlist notification error:', e); }

    res.json({ message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Update appointment
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { topic, notes, meeting_link } = req.body;
    const appointment = db.prepare("SELECT a.*, s.meeting_type as slot_meeting_type FROM appointments a JOIN availability_slots s ON a.slot_id = s.id WHERE a.id = ? AND a.status = 'scheduled'").get(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.student_id !== req.user.id && appointment.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates = [], params = [];
    if (topic !== undefined) { updates.push('topic = ?'); params.push(topic); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (meeting_link !== undefined && (req.user.id === appointment.instructor_id || req.user.role === 'admin')) {
      updates.push('meeting_link = ?'); params.push(meeting_link);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    db.prepare('UPDATE appointments SET ' + updates.join(', ') + ' WHERE id = ?').run(...params);
    logAction(req.user.id, 'APPOINTMENT_UPDATED', 'appointment', id, { updated_fields: Object.keys(req.body) }, req);
    res.json({ message: 'Appointment updated' });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Mark complete/no-show
router.post('/:id/complete', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['completed', 'no-show'].includes(status)) return res.status(400).json({ error: 'Status must be completed or no-show' });

    const appointment = db.prepare("SELECT * FROM appointments WHERE id = ? AND status = 'scheduled'").get(id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the instructor can mark completion' });
    }

    db.prepare('UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    logAction(req.user.id, 'APPOINTMENT_' + status.toUpperCase(), 'appointment', id, {}, req);
    res.json({ message: 'Appointment marked as ' + status });
  } catch (error) {
    console.error('Complete appointment error:', error);
    res.status(500).json({ error: 'Failed to update appointment status' });
  }
});

// Admin history
router.get('/admin/history', authenticateToken, authorize('admin'), validateDateRange, (req, res) => {
  try {
    const { start_date, end_date, instructor_id, student_id, status } = req.query;
    let query = `
      SELECT a.*, i.first_name as instructor_first_name, i.last_name as instructor_last_name,
        st.first_name as student_first_name, st.last_name as student_last_name
      FROM appointments a JOIN users i ON a.instructor_id = i.id JOIN users st ON a.student_id = st.id WHERE 1=1
    `;
    const params = [];
    if (start_date) { query += ' AND a.date >= ?'; params.push(start_date); }
    if (end_date) { query += ' AND a.date <= ?'; params.push(end_date); }
    if (instructor_id) { query += ' AND a.instructor_id = ?'; params.push(instructor_id); }
    if (student_id) { query += ' AND a.student_id = ?'; params.push(student_id); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }
    query += ' ORDER BY a.date DESC, a.start_time DESC LIMIT 500';

    const appointments = db.prepare(query).all(...params);
    res.json({ appointments });
  } catch (error) {
    console.error('Get appointment history error:', error);
    res.status(500).json({ error: 'Failed to fetch appointment history' });
  }
});

module.exports = router;
