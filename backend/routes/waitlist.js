const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const emailService = require('../utils/emailService');

const router = express.Router();

// Get waitlist for a slot
router.get('/slot/:slotId', authenticateToken, (req, res) => {
  try {
    const { slotId } = req.params;
    
    const slot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Only instructor/admin can see full waitlist, students can see their position
    if (slot.instructor_id !== req.user.id && req.user.role !== 'admin') {
      const myPosition = db.prepare(`
        SELECT position FROM waitlist WHERE slot_id = ? AND student_id = ?
      `).get(slotId, req.user.id);
      
      const totalCount = db.prepare('SELECT COUNT(*) as count FROM waitlist WHERE slot_id = ?').get(slotId);
      
      return res.json({ 
        my_position: myPosition?.position || null,
        total_waiting: totalCount.count
      });
    }

    const waitlist = db.prepare(`
      SELECT w.*, u.first_name, u.last_name, u.email
      FROM waitlist w
      JOIN users u ON w.student_id = u.id
      WHERE w.slot_id = ?
      ORDER BY w.position
    `).all(slotId);

    res.json({ waitlist });
  } catch (error) {
    console.error('Get waitlist error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// Join waitlist for a slot
router.post('/join', authenticateToken, authorize('student', 'admin'), (req, res) => {
  try {
    const { slot_id } = req.body;

    if (!slot_id) return res.status(400).json({ error: 'slot_id is required' });

    const slot = db.prepare(`
      SELECT s.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name
      FROM availability_slots s
      JOIN users u ON s.instructor_id = u.id
      WHERE s.id = ?
    `).get(slot_id);
    
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Check if slot is in future
    const slotDate = new Date(`${slot.date}T${slot.start_time}`);
    if (slotDate <= new Date()) {
      return res.status(400).json({ error: 'Cannot join waitlist for past slots' });
    }

    // Check if slot is actually booked
    const isBooked = db.prepare(`
      SELECT id FROM appointments WHERE slot_id = ? AND status = 'scheduled'
    `).get(slot_id);

    if (!isBooked) {
      return res.status(400).json({ error: 'Slot is available - book it directly instead' });
    }

    // Check if already on waitlist
    const existing = db.prepare('SELECT id FROM waitlist WHERE slot_id = ? AND student_id = ?')
      .get(slot_id, req.user.id);
    
    if (existing) {
      return res.status(409).json({ error: 'Already on waitlist for this slot' });
    }

    // Get next position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM waitlist WHERE slot_id = ?').get(slot_id);
    const position = (maxPos.max || 0) + 1;

    const waitlistId = uuidv4();
    db.prepare(`
      INSERT INTO waitlist (id, slot_id, student_id, position) VALUES (?, ?, ?, ?)
    `).run(waitlistId, slot_id, req.user.id, position);

    logAction(req.user.id, 'WAITLIST_JOINED', 'waitlist', waitlistId, { slot_id, position }, req);

    res.status(201).json({ 
      message: 'Added to waitlist', 
      position,
      slot_info: {
        date: slot.date,
        start_time: slot.start_time,
        instructor: `${slot.instructor_first_name} ${slot.instructor_last_name}`
      }
    });
  } catch (error) {
    console.error('Join waitlist error:', error);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// Leave waitlist
router.delete('/leave/:slotId', authenticateToken, (req, res) => {
  try {
    const { slotId } = req.params;

    const entry = db.prepare('SELECT * FROM waitlist WHERE slot_id = ? AND student_id = ?')
      .get(slotId, req.user.id);

    if (!entry) {
      return res.status(404).json({ error: 'Not on waitlist for this slot' });
    }

    // Remove from waitlist
    db.prepare('DELETE FROM waitlist WHERE id = ?').run(entry.id);

    // Reorder positions
    db.prepare(`
      UPDATE waitlist SET position = position - 1 
      WHERE slot_id = ? AND position > ?
    `).run(slotId, entry.position);

    logAction(req.user.id, 'WAITLIST_LEFT', 'waitlist', entry.id, { slot_id: slotId }, req);

    res.json({ message: 'Removed from waitlist' });
  } catch (error) {
    console.error('Leave waitlist error:', error);
    res.status(500).json({ error: 'Failed to leave waitlist' });
  }
});

// Get my waitlist entries
router.get('/my-waitlist', authenticateToken, (req, res) => {
  try {
    const entries = db.prepare(`
      SELECT 
        w.*,
        s.date, s.start_time, s.end_time, s.location,
        u.first_name as instructor_first_name, u.last_name as instructor_last_name, u.department
      FROM waitlist w
      JOIN availability_slots s ON w.slot_id = s.id
      JOIN users u ON s.instructor_id = u.id
      WHERE w.student_id = ?
      AND s.date >= date('now')
      ORDER BY s.date, s.start_time
    `).all(req.user.id);

    res.json({ waitlist_entries: entries });
  } catch (error) {
    console.error('Get my waitlist error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist entries' });
  }
});

// Notify next person on waitlist (called when appointment is cancelled)
async function notifyNextOnWaitlist(slotId) {
  try {
    const nextInLine = db.prepare(`
      SELECT w.*, u.first_name, u.last_name, u.email
      FROM waitlist w
      JOIN users u ON w.student_id = u.id
      WHERE w.slot_id = ? AND w.notified = 0
      ORDER BY w.position
      LIMIT 1
    `).get(slotId);

    if (!nextInLine) return null;

    const slot = db.prepare(`
      SELECT s.*, u.first_name as instructor_first_name, u.last_name as instructor_last_name, u.email as instructor_email
      FROM availability_slots s
      JOIN users u ON s.instructor_id = u.id
      WHERE s.id = ?
    `).get(slotId);

    if (!slot) return null;

    // Send notification
    await emailService.sendWaitlistNotification(
      slot,
      { first_name: nextInLine.first_name, last_name: nextInLine.last_name, email: nextInLine.email },
      { first_name: slot.instructor_first_name, last_name: slot.instructor_last_name }
    );

    // Mark as notified
    db.prepare('UPDATE waitlist SET notified = 1 WHERE id = ?').run(nextInLine.id);

    // Also create in-app notification
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, link)
      VALUES (?, ?, 'waitlist_available', 'Spot Available!', ?, '/book')
    `).run(
      uuidv4(),
      nextInLine.student_id,
      `A spot opened up for ${slot.instructor_first_name} ${slot.instructor_last_name} on ${slot.date} at ${slot.start_time}. Book it before someone else does!`
    );

    return nextInLine;
  } catch (error) {
    console.error('Notify waitlist error:', error);
    return null;
  }
}

module.exports = router;
module.exports.notifyNextOnWaitlist = notifyNextOnWaitlist;
