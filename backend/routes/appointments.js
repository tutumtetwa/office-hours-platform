const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { Resend } = require('resend');

const router = express.Router();

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper to send email
async function sendEmail(to, subject, html) {
  if (!resend) {
    console.log('[DEV MODE] Email to:', to, 'Subject:', subject);
    return true;
  }
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@officehourscs370.online',
      to,
      subject,
      html
    });
    console.log('Email sent to:', to);
    return true;
  } catch (e) {
    console.error('Email error:', e);
    return false;
  }
}

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
    `, [req.user.userId]);
    
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
      is_instructor: a.instructor_id === req.user.userId
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
      SELECT s.*, u.first_name, u.last_name, u.email as instructor_email
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
    `, [req.user.userId, slot.date, slot.start_time, slot.end_time]);
    
    if (conflictResult.rows.length > 0) {
      return res.status(409).json({ error: 'You have a conflicting appointment at this time' });
    }
    
    const appointmentId = uuidv4();
    await pool.query(
      'INSERT INTO appointments (id, slot_id, student_id, instructor_id, date, start_time, end_time, meeting_type, location, topic, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())',
      [appointmentId, slot_id, req.user.userId, slot.instructor_id, slot.date, slot.start_time, slot.end_time, meeting_type, slot.location, topic, notes]
    );
    
    // Remove student from waitlist if they were on it
    await pool.query('DELETE FROM waitlist WHERE slot_id = $1 AND student_id = $2', [slot_id, req.user.userId]);
    
    // Get student info
    const studentResult = await pool.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [req.user.userId]);
    const student = studentResult.rows[0];
    
    const formattedDate = new Date(slot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    // Notify instructor (in-app)
    await createNotification(
      slot.instructor_id,
      'new_booking',
      'New Appointment Booked',
      `${student.first_name} ${student.last_name} booked an appointment with you on ${formattedDate} at ${slot.start_time}.`
    );
    
    // Notify student (in-app)
    await createNotification(
      req.user.userId,
      'booking_confirmed',
      'Booking Confirmed',
      `Your appointment with ${slot.first_name} ${slot.last_name} on ${formattedDate} at ${slot.start_time} has been confirmed.`
    );
    
    // EMAIL: Send confirmation to student
    await sendEmail(
      student.email,
      '✅ Appointment Confirmed - Office Hours',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a5f;">Appointment Confirmed!</h2>
          <p>Hi ${student.first_name},</p>
          <p>Your appointment has been successfully booked.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${slot.start_time} - ${slot.end_time}</p>
            <p style="margin: 5px 0;"><strong>👨‍🏫 Instructor:</strong> ${slot.first_name} ${slot.last_name}</p>
            <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${slot.location || 'TBD'}</p>
            ${topic ? `<p style="margin: 5px 0;"><strong>📝 Topic:</strong> ${topic}</p>` : ''}
          </div>
          <p>Need to make changes? <a href="${process.env.FRONTEND_URL || 'https://officehourscs370.online'}/my-appointments">Manage your appointments</a></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">Office Hours Booking Platform</p>
        </div>
      `
    );
    
    // EMAIL: Send notification to instructor
    await sendEmail(
      slot.instructor_email,
      '📅 New Appointment Booked - Office Hours',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1e3a5f;">New Appointment</h2>
          <p>Hi ${slot.first_name},</p>
          <p>A student has booked an appointment with you.</p>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>👤 Student:</strong> ${student.first_name} ${student.last_name}</p>
            <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${student.email}</p>
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${slot.start_time} - ${slot.end_time}</p>
            <p style="margin: 5px 0;"><strong>📍 Location:</strong> ${slot.location || 'TBD'}</p>
            ${topic ? `<p style="margin: 5px 0;"><strong>📝 Topic:</strong> ${topic}</p>` : ''}
          </div>
          <p><a href="${process.env.FRONTEND_URL || 'https://officehourscs370.online'}/my-appointments">View all appointments</a></p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">Office Hours Booking Platform</p>
        </div>
      `
    );
    
    await logAction(req.user.userId, 'APPOINTMENT_BOOKED', { appointment_id: appointmentId, instructor_id: slot.instructor_id, date: slot.date }, req);
    
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
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email,
        s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email
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
    if (apt.student_id !== req.user.userId && apt.instructor_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
    }
    
    // Cancel the appointment
    await pool.query(
      "UPDATE appointments SET status = 'cancelled', cancelled_by = $1, cancellation_reason = $2, cancelled_at = NOW() WHERE id = $3",
      [req.user.userId, reason, req.params.id]
    );
    
    const formattedDate = new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const cancelledBy = req.user.userId === apt.student_id ? 'student' : 'instructor';
    
    // Notify the other party (in-app)
    if (cancelledBy === 'student') {
      await createNotification(
        apt.instructor_id,
        'booking_cancelled',
        'Appointment Cancelled',
        `${apt.student_first_name} ${apt.student_last_name} cancelled their appointment on ${formattedDate} at ${apt.start_time}.`
      );
      
      // EMAIL to instructor
      await sendEmail(
        apt.instructor_email,
        '❌ Appointment Cancelled - Office Hours',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc3545;">Appointment Cancelled</h2>
            <p>Hi ${apt.instructor_first_name},</p>
            <p>An appointment has been cancelled by the student.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>👤 Student:</strong> ${apt.student_first_name} ${apt.student_last_name}</p>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${apt.start_time} - ${apt.end_time}</p>
              ${reason ? `<p style="margin: 5px 0;"><strong>📝 Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p>This time slot is now available for other students to book.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px;">Office Hours Booking Platform</p>
          </div>
        `
      );
    } else {
      await createNotification(
        apt.student_id,
        'booking_cancelled',
        'Appointment Cancelled',
        `${apt.instructor_first_name} ${apt.instructor_last_name} cancelled your appointment on ${formattedDate} at ${apt.start_time}.`
      );
      
      // EMAIL to student
      await sendEmail(
        apt.student_email,
        '❌ Appointment Cancelled - Office Hours',
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc3545;">Appointment Cancelled</h2>
            <p>Hi ${apt.student_first_name},</p>
            <p>Your appointment has been cancelled by the instructor.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>👨‍🏫 Instructor:</strong> ${apt.instructor_first_name} ${apt.instructor_last_name}</p>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Time:</strong> ${apt.start_time} - ${apt.end_time}</p>
              ${reason ? `<p style="margin: 5px 0;"><strong>📝 Reason:</strong> ${reason}</p>` : ''}
            </div>
            <p><a href="${process.env.FRONTEND_URL || 'https://officehourscs370.online'}/book">Book another appointment</a></p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px;">Office Hours Booking Platform</p>
          </div>
        `
      );
    }
    
    // NOTIFY WAITLIST
    try {
      const waitlistRoute = require('./waitlist');
      if (waitlistRoute.notifyNextOnWaitlist) {
        await waitlistRoute.notifyNextOnWaitlist(apt.slot_id);
      }
    } catch (e) {
      console.error('Waitlist notify error:', e);
    }
    
    await logAction(req.user.userId, 'APPOINTMENT_CANCELLED', { appointment_id: req.params.id, reason }, req);
    
    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

// Complete appointment
router.post('/:id/complete', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['completed', 'no-show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use "completed" or "no-show"' });
    }
    
    await pool.query('UPDATE appointments SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
    await logAction(req.user.userId, `APPOINTMENT_${status.toUpperCase().replace('-', '_')}`, { appointment_id: req.params.id }, req);
    
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