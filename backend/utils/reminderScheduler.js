const cron = require('node-cron');
const { db } = require('../models/database');
const { sendAppointmentReminder } = require('./emailService');
const { logAction } = require('./logger');

// Track sent reminders to avoid duplicates
const sentReminders = new Set();

// Initialize the reminder scheduler
function initializeReminderScheduler() {
  console.log('⏰ Starting appointment reminder scheduler...');

  // Run every 15 minutes to check for upcoming appointments
  cron.schedule('*/15 * * * *', async () => {
    await sendReminders();
  });

  // Also run immediately on startup
  setTimeout(sendReminders, 5000);
}

async function sendReminders() {
  try {
    const now = new Date();
    
    // Get appointments in the next 25 hours that are still scheduled
    const upcomingAppointments = db.prepare(`
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
      WHERE a.status = 'scheduled'
        AND datetime(a.date || ' ' || a.start_time) > datetime('now')
        AND datetime(a.date || ' ' || a.start_time) <= datetime('now', '+25 hours')
    `).all();

    for (const apt of upcomingAppointments) {
      const appointmentTime = new Date(`${apt.date}T${apt.start_time}`);
      const hoursUntil = (appointmentTime - now) / (1000 * 60 * 60);

      // 24-hour reminder (between 23-25 hours before)
      const reminder24Key = `24h-${apt.id}`;
      if (hoursUntil >= 23 && hoursUntil <= 25 && !sentReminders.has(reminder24Key)) {
        await sendAppointmentReminder(
          apt,
          { first_name: apt.student_first_name, last_name: apt.student_last_name, email: apt.student_email },
          { first_name: apt.instructor_first_name, last_name: apt.instructor_last_name, email: apt.instructor_email },
          24
        );
        sentReminders.add(reminder24Key);
        logAction(null, 'REMINDER_SENT', 'appointment', apt.id, { type: '24h' });
        console.log(`📧 Sent 24h reminder for appointment ${apt.id}`);
      }

      // 1-hour reminder (between 0.5-1.5 hours before)
      const reminder1Key = `1h-${apt.id}`;
      if (hoursUntil >= 0.5 && hoursUntil <= 1.5 && !sentReminders.has(reminder1Key)) {
        await sendAppointmentReminder(
          apt,
          { first_name: apt.student_first_name, last_name: apt.student_last_name, email: apt.student_email },
          { first_name: apt.instructor_first_name, last_name: apt.instructor_last_name, email: apt.instructor_email },
          1
        );
        sentReminders.add(reminder1Key);
        logAction(null, 'REMINDER_SENT', 'appointment', apt.id, { type: '1h' });
        console.log(`📧 Sent 1h reminder for appointment ${apt.id}`);
      }
    }

    // Clean up old reminder keys (older than 48 hours worth)
    if (sentReminders.size > 1000) {
      sentReminders.clear();
    }

  } catch (error) {
    console.error('Error sending reminders:', error);
  }
}

module.exports = { initializeReminderScheduler };
