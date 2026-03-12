const express = require('express');
const { db } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');
const { generateAppointmentICS, generateAvailabilityICS, getCalendarSubscriptionInfo } = require('../utils/calendarService');

const router = express.Router();

// Get calendar subscription info
router.get('/subscribe', authenticateToken, (req, res) => {
  const info = getCalendarSubscriptionInfo(req.user.id, req.user.role);
  res.json(info);
});

// Download ICS for a single appointment
router.get('/appointment/:id/download', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const appointment = db.prepare(`
      SELECT 
        a.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.email as student_email,
        i.first_name as instructor_first_name,
        i.last_name as instructor_last_name,
        i.email as instructor_email
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users i ON a.instructor_id = i.id
      WHERE a.id = ?
    `).get(id);

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check authorization
    if (appointment.student_id !== req.user.id && 
        appointment.instructor_id !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isForStudent = appointment.student_id === req.user.id;
    
    const student = {
      first_name: appointment.student_first_name,
      last_name: appointment.student_last_name,
      email: appointment.student_email
    };
    
    const instructor = {
      first_name: appointment.instructor_first_name,
      last_name: appointment.instructor_last_name,
      email: appointment.instructor_email
    };

    const icsContent = generateAppointmentICS(appointment, student, instructor, isForStudent);

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="appointment-${id}.ics"`);
    res.send(icsContent);
  } catch (error) {
    console.error('Download appointment ICS error:', error);
    res.status(500).json({ error: 'Failed to generate calendar file' });
  }
});

// Get ICS feed for all upcoming appointments (for calendar subscription)
router.get('/:userId/feed.ics', (req, res) => {
  try {
    const { userId } = req.params;

    // Get user info
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    let appointments;
    
    if (user.role === 'instructor') {
      // Get instructor's appointments and availability
      appointments = db.prepare(`
        SELECT 
          a.*,
          s.first_name as student_first_name,
          s.last_name as student_last_name,
          s.email as student_email
        FROM appointments a
        JOIN users s ON a.student_id = s.id
        WHERE a.instructor_id = ?
        AND a.status = 'scheduled'
        AND a.date >= date('now')
        ORDER BY a.date, a.start_time
      `).all(userId);
    } else {
      // Get student's appointments
      appointments = db.prepare(`
        SELECT 
          a.*,
          i.first_name as instructor_first_name,
          i.last_name as instructor_last_name,
          i.email as instructor_email
        FROM appointments a
        JOIN users i ON a.instructor_id = i.id
        WHERE a.student_id = ?
        AND a.status = 'scheduled'
        AND a.date >= date('now')
        ORDER BY a.date, a.start_time
      `).all(userId);
    }

    // Generate ICS
    const ical = require('ical-generator').default;
    const calendar = ical({
      name: `Office Hours - ${user.first_name} ${user.last_name}`,
      prodId: { company: 'Office Hours Platform', product: 'Booking System' }
    });

    for (const apt of appointments) {
      const startTime = new Date(`${apt.date}T${apt.start_time}`);
      const endTime = new Date(`${apt.date}T${apt.end_time}`);

      let summary, description;
      
      if (user.role === 'instructor') {
        summary = `Office Hours: ${apt.student_first_name} ${apt.student_last_name}`;
        description = `Student: ${apt.student_first_name} ${apt.student_last_name}\nEmail: ${apt.student_email}`;
      } else {
        summary = `Office Hours with ${apt.instructor_first_name} ${apt.instructor_last_name}`;
        description = `Instructor: ${apt.instructor_first_name} ${apt.instructor_last_name}\nEmail: ${apt.instructor_email}`;
      }

      if (apt.topic) {
        description += `\nTopic: ${apt.topic}`;
      }

      if (apt.meeting_link) {
        description += `\nMeeting Link: ${apt.meeting_link}`;
      }

      calendar.createEvent({
        start: startTime,
        end: endTime,
        summary,
        description,
        location: apt.meeting_type === 'virtual' ? (apt.meeting_link || 'Virtual') : (apt.location || ''),
        uid: `appointment-${apt.id}@officehours.edu`,
        status: 'CONFIRMED'
      });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(calendar.toString());
  } catch (error) {
    console.error('Generate calendar feed error:', error);
    res.status(500).send('Failed to generate calendar feed');
  }
});

// Download all upcoming appointments as ICS
router.get('/download-all', authenticateToken, (req, res) => {
  try {
    let appointments;
    const isInstructor = req.user.role === 'instructor';
    
    if (isInstructor) {
      appointments = db.prepare(`
        SELECT 
          a.*,
          s.first_name as other_first_name,
          s.last_name as other_last_name,
          s.email as other_email
        FROM appointments a
        JOIN users s ON a.student_id = s.id
        WHERE a.instructor_id = ?
        AND a.status = 'scheduled'
        AND a.date >= date('now')
        ORDER BY a.date, a.start_time
      `).all(req.user.id);
    } else {
      appointments = db.prepare(`
        SELECT 
          a.*,
          i.first_name as other_first_name,
          i.last_name as other_last_name,
          i.email as other_email
        FROM appointments a
        JOIN users i ON a.instructor_id = i.id
        WHERE a.student_id = ?
        AND a.status = 'scheduled'
        AND a.date >= date('now')
        ORDER BY a.date, a.start_time
      `).all(req.user.id);
    }

    const ical = require('ical-generator').default;
    const calendar = ical({
      name: `Office Hours - ${req.user.first_name} ${req.user.last_name}`,
      prodId: { company: 'Office Hours Platform', product: 'Booking System' }
    });

    for (const apt of appointments) {
      const startTime = new Date(`${apt.date}T${apt.start_time}`);
      const endTime = new Date(`${apt.date}T${apt.end_time}`);

      const summary = isInstructor 
        ? `Office Hours: ${apt.other_first_name} ${apt.other_last_name}`
        : `Office Hours with ${apt.other_first_name} ${apt.other_last_name}`;

      let description = isInstructor
        ? `Student: ${apt.other_first_name} ${apt.other_last_name}\nEmail: ${apt.other_email}`
        : `Instructor: ${apt.other_first_name} ${apt.other_last_name}\nEmail: ${apt.other_email}`;

      if (apt.topic) description += `\nTopic: ${apt.topic}`;
      if (apt.meeting_link) description += `\nMeeting Link: ${apt.meeting_link}`;

      calendar.createEvent({
        start: startTime,
        end: endTime,
        summary,
        description,
        location: apt.meeting_type === 'virtual' ? (apt.meeting_link || 'Virtual') : (apt.location || ''),
        uid: `appointment-${apt.id}@officehours.edu`,
        status: 'CONFIRMED',
        alarms: [{ type: 'display', trigger: 3600 }]
      });
    }

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="office-hours.ics"');
    res.send(calendar.toString());
  } catch (error) {
    console.error('Download all appointments error:', error);
    res.status(500).json({ error: 'Failed to generate calendar file' });
  }
});

module.exports = router;
