const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');

// Notification types
const NOTIFICATION_TYPES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  WAITLIST_SPOT_AVAILABLE: 'waitlist_available',
  SLOT_CANCELLED: 'slot_cancelled',
  NEW_BOOKING: 'new_booking'
};

// Create a notification
function createNotification(userId, type, title, message, link = null) {
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, title, message, link);
    return id;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

// Get user's notifications
function getUserNotifications(userId, limit = 50, includeRead = false) {
  const query = includeRead
    ? `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC LIMIT ?`;
  
  return db.prepare(query).all(userId, limit);
}

// Get unread count
function getUnreadCount(userId) {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
  `).get(userId);
  return result?.count || 0;
}

// Mark notification as read
function markAsRead(notificationId, userId) {
  db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
  `).run(notificationId, userId);
}

// Mark all as read
function markAllAsRead(userId) {
  db.prepare(`
    UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0
  `).run(userId);
}

// Delete old notifications (cleanup)
function cleanupOldNotifications(daysOld = 30) {
  db.prepare(`
    DELETE FROM notifications WHERE created_at < datetime('now', '-' || ? || ' days')
  `).run(daysOld);
}

// Helper functions for specific notification types

function notifyBookingConfirmed(studentId, instructorName, date, time) {
  return createNotification(
    studentId,
    NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    'Appointment Confirmed',
    `Your appointment with ${instructorName} on ${date} at ${time} has been confirmed.`,
    '/my-appointments'
  );
}

function notifyNewBooking(instructorId, studentName, date, time) {
  return createNotification(
    instructorId,
    NOTIFICATION_TYPES.NEW_BOOKING,
    'New Appointment',
    `${studentName} has booked an appointment on ${date} at ${time}.`,
    '/my-appointments'
  );
}

function notifyBookingCancelled(userId, otherPartyName, date, time, cancelledByOther) {
  const message = cancelledByOther
    ? `${otherPartyName} has cancelled the appointment on ${date} at ${time}.`
    : `You have cancelled the appointment with ${otherPartyName} on ${date} at ${time}.`;
  
  return createNotification(
    userId,
    NOTIFICATION_TYPES.BOOKING_CANCELLED,
    'Appointment Cancelled',
    message,
    '/my-appointments'
  );
}

function notifyWaitlistSpotAvailable(studentId, instructorName, date, time) {
  return createNotification(
    studentId,
    NOTIFICATION_TYPES.WAITLIST_SPOT_AVAILABLE,
    '🎉 Spot Available!',
    `A spot has opened up for ${instructorName}'s office hours on ${date} at ${time}. Book now!`,
    '/book'
  );
}

function notifyAppointmentReminder(userId, otherPartyName, date, time, hoursUntil) {
  const urgency = hoursUntil <= 1 ? '⏰ ' : '';
  const timeText = hoursUntil <= 1 ? 'in 1 hour' : 'tomorrow';
  
  return createNotification(
    userId,
    NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    `${urgency}Appointment ${timeText}`,
    `Reminder: You have an appointment with ${otherPartyName} on ${date} at ${time}.`,
    '/my-appointments'
  );
}

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  cleanupOldNotifications,
  notifyBookingConfirmed,
  notifyNewBooking,
  notifyBookingCancelled,
  notifyWaitlistSpotAvailable,
  notifyAppointmentReminder
};
