const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Helper to create notification
async function createNotification(userId, type, title, message) {
  try {
    await pool.query(
      'INSERT INTO notifications (id, user_id, type, title, message, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [uuidv4(), userId, type, title, message]
    );
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

// Get my waitlist entries
router.get('/my-waitlist', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, 
        s.date, s.start_time, s.end_time, s.location,
        u.first_name as instructor_first_name, 
        u.last_name as instructor_last_name,
        u.department as instructor_department
      FROM waitlist w
      JOIN availability_slots s ON w.slot_id = s.id
      JOIN users u ON s.instructor_id = u.id
      WHERE w.student_id = $1 AND s.date >= CURRENT_DATE
      ORDER BY s.date, s.start_time
    `, [req.user.userId]);
    
    res.json({ waitlist_entries: result.rows });
  } catch (error) {
    console.error('Get waitlist error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// Join waitlist for a slot
router.post('/join', authenticateToken, authorize('student', 'admin'), async (req, res) => {
  try {
    const { slot_id } = req.body;
    
    // Check if slot exists
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
      return res.status(400).json({ error: 'Cannot join waitlist for past slots' });
    }
    
    // Check if slot is actually booked (waitlist only makes sense for booked slots)
    const isBooked = await pool.query(
      "SELECT id FROM appointments WHERE slot_id = $1 AND status = 'scheduled'",
      [slot_id]
    );
    
    if (isBooked.rows.length === 0) {
      return res.status(400).json({ error: 'Slot is available - you can book it directly!' });
    }
    
    // Check if already on waitlist
    const alreadyOnWaitlist = await pool.query(
      'SELECT id FROM waitlist WHERE slot_id = $1 AND student_id = $2',
      [slot_id, req.user.userId]
    );
    
    if (alreadyOnWaitlist.rows.length > 0) {
      return res.status(409).json({ error: 'You are already on the waitlist for this slot' });
    }
    
    // Check if student already has an appointment at this time
    const hasConflict = await pool.query(`
      SELECT id FROM appointments 
      WHERE student_id = $1 AND date = $2 AND status = 'scheduled'
      AND ((start_time <= $3 AND end_time > $3) OR (start_time < $4 AND end_time >= $4))
    `, [req.user.userId, slot.date, slot.start_time, slot.end_time]);
    
    if (hasConflict.rows.length > 0) {
      return res.status(409).json({ error: 'You have a conflicting appointment at this time' });
    }
    
    // Get current max position
    const posResult = await pool.query(
      'SELECT COALESCE(MAX(position), 0) as max_pos FROM waitlist WHERE slot_id = $1',
      [slot_id]
    );
    const position = posResult.rows[0].max_pos + 1;
    
    // Add to waitlist
    const waitlistId = uuidv4();
    await pool.query(
      'INSERT INTO waitlist (id, slot_id, student_id, position, created_at) VALUES ($1, $2, $3, $4, NOW())',
      [waitlistId, slot_id, req.user.userId, position]
    );
    
    // Get waitlist count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM waitlist WHERE slot_id = $1',
      [slot_id]
    );
    
    res.status(201).json({ 
      message: 'Added to waitlist', 
      position,
      waitlist_count: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Join waitlist error:', error);
    res.status(500).json({ error: 'Failed to join waitlist' });
  }
});

// Leave waitlist
router.delete('/leave/:slotId', authenticateToken, async (req, res) => {
  try {
    const { slotId } = req.params;
    
    // Get the position of the leaving student
    const leavingResult = await pool.query(
      'SELECT position FROM waitlist WHERE slot_id = $1 AND student_id = $2',
      [slotId, req.user.userId]
    );
    
    if (leavingResult.rows.length === 0) {
      return res.status(404).json({ error: 'You are not on the waitlist for this slot' });
    }
    
    const leavingPosition = leavingResult.rows[0].position;
    
    // Remove from waitlist
    await pool.query(
      'DELETE FROM waitlist WHERE slot_id = $1 AND student_id = $2',
      [slotId, req.user.userId]
    );
    
    // Update positions for everyone after
    await pool.query(
      'UPDATE waitlist SET position = position - 1 WHERE slot_id = $1 AND position > $2',
      [slotId, leavingPosition]
    );
    
    res.json({ message: 'Removed from waitlist' });
  } catch (error) {
    console.error('Leave waitlist error:', error);
    res.status(500).json({ error: 'Failed to leave waitlist' });
  }
});

// Get waitlist for a specific slot (for instructors to see who's waiting)
router.get('/slot/:slotId', authenticateToken, async (req, res) => {
  try {
    const { slotId } = req.params;
    
    const result = await pool.query(`
      SELECT w.*, u.first_name, u.last_name, u.email
      FROM waitlist w
      JOIN users u ON w.student_id = u.id
      WHERE w.slot_id = $1
      ORDER BY w.position
    `, [slotId]);
    
    // Check if user is instructor of this slot or admin
    const slotResult = await pool.query('SELECT instructor_id FROM availability_slots WHERE id = $1', [slotId]);
    
    if (slotResult.rows.length === 0) {
      return res.status(404).json({ error: 'Slot not found' });
    }
    
    const isInstructor = slotResult.rows[0].instructor_id === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    
    // Students can only see their position, not the full list
    if (!isInstructor && !isAdmin) {
      const myEntry = result.rows.find(r => r.student_id === req.user.userId);
      return res.json({ 
        my_position: myEntry?.position || null,
        total_waiting: result.rows.length
      });
    }
    
    res.json({ 
      waitlist: result.rows,
      total_waiting: result.rows.length
    });
  } catch (error) {
    console.error('Get slot waitlist error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// Notify next person on waitlist (called when an appointment is cancelled)
async function notifyNextOnWaitlist(slotId) {
  try {
    // Get the first person on waitlist
    const nextResult = await pool.query(`
      SELECT w.*, u.first_name, u.email, s.date, s.start_time, s.end_time,
        inst.first_name as instructor_first_name, inst.last_name as instructor_last_name
      FROM waitlist w
      JOIN users u ON w.student_id = u.id
      JOIN availability_slots s ON w.slot_id = s.id
      JOIN users inst ON s.instructor_id = inst.id
      WHERE w.slot_id = $1 AND w.notified = 0
      ORDER BY w.position
      LIMIT 1
    `, [slotId]);
    
    if (nextResult.rows.length === 0) {
      return null;
    }
    
    const next = nextResult.rows[0];
    
    // Mark as notified
    await pool.query(
      'UPDATE waitlist SET notified = 1 WHERE id = $1',
      [next.id]
    );
    
    // Create in-app notification
    const formattedDate = new Date(next.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    await createNotification(
      next.student_id,
      'waitlist_available',
      'Spot Available!',
      `A slot with ${next.instructor_first_name} ${next.instructor_last_name} on ${formattedDate} at ${next.start_time} is now available! Book it before someone else does.`
    );
    
    return next;
  } catch (error) {
    console.error('Notify waitlist error:', error);
    return null;
  }
}

// Export the notify function for use in appointments route
router.notifyNextOnWaitlist = notifyNextOnWaitlist;

module.exports = router;