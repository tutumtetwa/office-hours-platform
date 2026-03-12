const cron = require('node-cron');
const { format, addHours, addDays, isWithinInterval } = require('date-fns');
const emailService = require('./emailService');

let db = null;

// Initialize scheduler with database reference
function initializeScheduler(database) {
  db = database;
  
  // Run every 15 minutes to check for upcoming appointments
  cron.schedule('*/15 * * * *', () => {
    console.log('⏰ Running reminder check...');
    checkAndSendReminders();
  });

  console.log('⏰ Reminder scheduler initialized');
}

// Check for appointments needing reminders
async function checkAndSendReminders() {
  if (!db) {
    console.error('Database not initialized for scheduler');
    return;
  }

  const now = new Date();
  
  try {
    // Get appointments that need 24-hour reminders
    // (appointments tomorrow that haven't been reminded)
    const tomorrow = addDays(now, 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    const appointments24h = db.prepare(`
      SELECT 
        a.*,
        s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email,
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users i ON a.instructor_id = i.id
      WHERE a.status = 'scheduled'
        AND a.date = ?
        AND a.reminder_24h_sent IS NULL
    `).all(tomorrowStr);

    for (const apt of appointments24h) {
      const student = {
        first_name: apt.student_first_name,
        last_name: apt.student_last_name,
        email: apt.student_email
      };
      const instructor = {
        first_name: apt.instructor_first_name,
        last_name: apt.instructor_last_name,
        email: apt.instructor_email
      };

      await emailService.sendReminder24h(apt, student, instructor);
      
      // Mark as sent
      db.prepare('UPDATE appointments SET reminder_24h_sent = CURRENT_TIMESTAMP WHERE id = ?').run(apt.id);
      console.log(`📧 24h reminder sent for appointment ${apt.id}`);
    }

    // Get appointments that need 1-hour reminders
    const oneHourLater = addHours(now, 1);
    const todayStr = format(now, 'yyyy-MM-dd');
    const currentTime = format(now, 'HH:mm');
    const oneHourTime = format(oneHourLater, 'HH:mm');

    const appointments1h = db.prepare(`
      SELECT 
        a.*,
        s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email,
        i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email
      FROM appointments a
      JOIN users s ON a.student_id = s.id
      JOIN users i ON a.instructor_id = i.id
      WHERE a.status = 'scheduled'
        AND a.date = ?
        AND a.start_time > ?
        AND a.start_time <= ?
        AND a.reminder_1h_sent IS NULL
    `).all(todayStr, currentTime, oneHourTime);

    for (const apt of appointments1h) {
      const student = {
        first_name: apt.student_first_name,
        last_name: apt.student_last_name,
        email: apt.student_email
      };
      const instructor = {
        first_name: apt.instructor_first_name,
        last_name: apt.instructor_last_name,
        email: apt.instructor_email
      };

      await emailService.sendReminder1h(apt, student, instructor);
      
      // Mark as sent
      db.prepare('UPDATE appointments SET reminder_1h_sent = CURRENT_TIMESTAMP WHERE id = ?').run(apt.id);
      console.log(`📧 1h reminder sent for appointment ${apt.id}`);
    }

  } catch (error) {
    console.error('Error checking reminders:', error);
  }
}

// Manually trigger reminder check (for testing)
function triggerReminderCheck() {
  checkAndSendReminders();
}

module.exports = {
  initializeScheduler,
  triggerReminderCheck
};
