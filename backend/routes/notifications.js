const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get my notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    const { unread_only, limit = 50 } = req.query;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const notifications = db.prepare(query).all(...params);

    // Get unread count
    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `).get(req.user.id);

    res.json({ 
      notifications,
      unread_count: unreadCount.count
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.post('/:id/read', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
      .get(id, req.user.id);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
      .run(req.user.id);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Delete a notification
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Clear all notifications
router.delete('/', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// === Notification Service Functions ===

function createNotification(userId, type, title, message, link = null) {
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, type, title, message, link);
    return id;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
}

// Convenience functions for common notifications
const notificationService = {
  notifyBookingConfirmed: (studentId, instructorName, date, time) => {
    createNotification(
      studentId,
      'booking_confirmed',
      'Appointment Confirmed',
      `Your appointment with ${instructorName} on ${date} at ${time} has been confirmed.`,
      '/my-appointments'
    );
  },

  notifyNewBooking: (instructorId, studentName, date, time) => {
    createNotification(
      instructorId,
      'new_booking',
      'New Appointment',
      `${studentName} has booked an appointment on ${date} at ${time}.`,
      '/my-appointments'
    );
  },

  notifyBookingCancelled: (userId, otherPartyName, date, time, wasCancelledByOther = false) => {
    const message = wasCancelledByOther
      ? `Your appointment with ${otherPartyName} on ${date} at ${time} has been cancelled.`
      : `You cancelled your appointment with ${otherPartyName} on ${date} at ${time}.`;
    
    createNotification(
      userId,
      'booking_cancelled',
      'Appointment Cancelled',
      message,
      '/my-appointments'
    );
  },

  notifyReminder: (userId, otherPartyName, date, time, hoursUntil) => {
    createNotification(
      userId,
      'reminder',
      `Appointment in ${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`,
      `Reminder: You have an appointment with ${otherPartyName} on ${date} at ${time}.`,
      '/my-appointments'
    );
  },

  notifyWaitlistSpotAvailable: (studentId, instructorName, date, time) => {
    createNotification(
      studentId,
      'waitlist_available',
      'Spot Available!',
      `A spot opened up with ${instructorName} on ${date} at ${time}. Book it before someone else does!`,
      '/book'
    );
  }
};

module.exports = router;
module.exports.createNotification = createNotification;
module.exports.notificationService = notificationService;
