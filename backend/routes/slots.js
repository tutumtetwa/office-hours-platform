const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateSlot, validateDateRange, validateUUID } = require('../utils/validators');
const { logAction } = require('../utils/logger');

const router = express.Router();

// Get all instructors (for students to see who has office hours)
router.get('/instructors', authenticateToken, (req, res) => {
  try {
    const instructors = db.prepare(`
      SELECT id, email, first_name, last_name, department
      FROM users
      WHERE role = 'instructor' AND is_active = 1
      ORDER BY last_name, first_name
    `).all();

    res.json({ instructors });
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
});

// Get available slots (with filtering)
router.get('/', authenticateToken, validateDateRange, (req, res) => {
  try {
    const { instructor_id, start_date, end_date, available_only } = req.query;

    let query = `
      SELECT 
        s.*,
        u.first_name as instructor_first_name,
        u.last_name as instructor_last_name,
        u.email as instructor_email,
        u.department as instructor_department,
        CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as is_booked,
        a.id as appointment_id,
        a.student_id as booked_by
      FROM availability_slots s
      JOIN users u ON s.instructor_id = u.id
      LEFT JOIN appointments a ON s.id = a.slot_id AND a.status = 'scheduled'
      WHERE 1=1
    `;
    const params = [];

    if (instructor_id) {
      query += ' AND s.instructor_id = ?';
      params.push(instructor_id);
    }

    if (start_date) {
      query += ' AND s.date >= ?';
      params.push(start_date);
    } else {
      // Default to today
      query += ' AND s.date >= date("now")';
    }

    if (end_date) {
      query += ' AND s.date <= ?';
      params.push(end_date);
    }

    if (available_only === 'true') {
      query += ' AND a.id IS NULL';
    }

    query += ' ORDER BY s.date, s.start_time';

    const slots = db.prepare(query).all(...params);

    // Transform for response
    const transformedSlots = slots.map(slot => ({
      id: slot.id,
      instructor_id: slot.instructor_id,
      instructor: {
        id: slot.instructor_id,
        first_name: slot.instructor_first_name,
        last_name: slot.instructor_last_name,
        email: slot.instructor_email,
        department: slot.instructor_department
      },
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      location: slot.location,
      meeting_type: slot.meeting_type,
      notes: slot.notes,
      is_booked: !!slot.is_booked,
      is_mine: slot.booked_by === req.user.id,
      appointment_id: slot.is_booked && slot.booked_by === req.user.id ? slot.appointment_id : null
    }));

    res.json({ slots: transformedSlots });
  } catch (error) {
    console.error('Get slots error:', error);
    res.status(500).json({ error: 'Failed to fetch availability slots' });
  }
});

// Get my slots (for instructors)
router.get('/my-slots', authenticateToken, authorize('instructor', 'admin'), validateDateRange, (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT 
        s.*,
        a.id as appointment_id,
        a.student_id,
        a.topic,
        a.meeting_type as booked_meeting_type,
        a.status as appointment_status,
        su.first_name as student_first_name,
        su.last_name as student_last_name,
        su.email as student_email
      FROM availability_slots s
      LEFT JOIN appointments a ON s.id = a.slot_id AND a.status = 'scheduled'
      LEFT JOIN users su ON a.student_id = su.id
      WHERE s.instructor_id = ?
    `;
    const params = [req.user.id];

    if (start_date) {
      query += ' AND s.date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND s.date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY s.date, s.start_time';

    const slots = db.prepare(query).all(...params);

    const transformedSlots = slots.map(slot => ({
      id: slot.id,
      date: slot.date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      location: slot.location,
      meeting_type: slot.meeting_type,
      notes: slot.notes,
      is_booked: !!slot.appointment_id,
      appointment: slot.appointment_id ? {
        id: slot.appointment_id,
        topic: slot.topic,
        meeting_type: slot.booked_meeting_type,
        status: slot.appointment_status,
        student: {
          id: slot.student_id,
          first_name: slot.student_first_name,
          last_name: slot.student_last_name,
          email: slot.student_email
        }
      } : null
    }));

    res.json({ slots: transformedSlots });
  } catch (error) {
    console.error('Get my slots error:', error);
    res.status(500).json({ error: 'Failed to fetch your slots' });
  }
});

// Create availability slot (instructor only)
router.post('/', authenticateToken, authorize('instructor', 'admin'), validateSlot, (req, res) => {
  try {
    const { date, start_time, end_time, location, meeting_type = 'either', notes } = req.body;

    // Check if slot date is in the future
    const slotDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (slotDate < today) {
      return res.status(400).json({ error: 'Cannot create slots in the past' });
    }

    // Check for overlapping slots
    const overlapping = db.prepare(`
      SELECT id FROM availability_slots
      WHERE instructor_id = ? 
      AND date = ?
      AND (
        (start_time < ? AND end_time > ?)
        OR (start_time < ? AND end_time > ?)
        OR (start_time >= ? AND end_time <= ?)
      )
    `).get(req.user.id, date, end_time, start_time, end_time, start_time, start_time, end_time);

    if (overlapping) {
      return res.status(409).json({ error: 'This time slot overlaps with an existing slot' });
    }

    const slotId = uuidv4();
    db.prepare(`
      INSERT INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(slotId, req.user.id, date, start_time, end_time, location, meeting_type, notes);

    logAction(req.user.id, 'SLOT_CREATED', 'availability_slot', slotId, { date, start_time, end_time }, req);

    const newSlot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(slotId);
    res.status(201).json({ message: 'Slot created', slot: newSlot });
  } catch (error) {
    console.error('Create slot error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'This exact slot already exists' });
    }
    res.status(500).json({ error: 'Failed to create slot' });
  }
});

// Create multiple slots at once (bulk creation)
router.post('/bulk', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { slots } = req.body;

    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Slots array is required' });
    }

    if (slots.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 slots per request' });
    }

    const created = [];
    const errors = [];

    const insertSlot = db.prepare(`
      INSERT INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const checkOverlap = db.prepare(`
      SELECT id FROM availability_slots
      WHERE instructor_id = ? AND date = ?
      AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
    `);

    const transaction = db.transaction(() => {
      for (const slot of slots) {
        const { date, start_time, end_time, location, meeting_type = 'either', notes } = slot;

        // Basic validation
        if (!date || !start_time || !end_time) {
          errors.push({ slot, error: 'Date, start_time, and end_time are required' });
          continue;
        }

        // Check overlap
        const overlap = checkOverlap.get(req.user.id, date, end_time, start_time, end_time, start_time, start_time, end_time);
        if (overlap) {
          errors.push({ slot, error: 'Overlaps with existing slot' });
          continue;
        }

        try {
          const slotId = uuidv4();
          insertSlot.run(slotId, req.user.id, date, start_time, end_time, location, meeting_type, notes);
          created.push({ id: slotId, ...slot });
        } catch (e) {
          errors.push({ slot, error: e.message });
        }
      }
    });

    transaction();

    logAction(req.user.id, 'SLOTS_BULK_CREATED', 'availability_slot', null, { 
      created_count: created.length, 
      error_count: errors.length 
    }, req);

    res.status(201).json({ 
      message: `Created ${created.length} slots`,
      created,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk create slots error:', error);
    res.status(500).json({ error: 'Failed to create slots' });
  }
});

// Update slot (instructor only, if not booked)
router.put('/:id', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { date, start_time, end_time, location, meeting_type, notes } = req.body;

    // Get existing slot
    const slot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(id);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Check ownership
    if (slot.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to modify this slot' });
    }

    // Check if booked
    const booking = db.prepare("SELECT id FROM appointments WHERE slot_id = ? AND status = 'scheduled'").get(id);
    if (booking) {
      return res.status(400).json({ error: 'Cannot modify a booked slot' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (date) { updates.push('date = ?'); params.push(date); }
    if (start_time) { updates.push('start_time = ?'); params.push(start_time); }
    if (end_time) { updates.push('end_time = ?'); params.push(end_time); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (meeting_type) { updates.push('meeting_type = ?'); params.push(meeting_type); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    db.prepare(`UPDATE availability_slots SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    logAction(req.user.id, 'SLOT_UPDATED', 'availability_slot', id, { updated_fields: Object.keys(req.body) }, req);

    const updatedSlot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(id);
    res.json({ message: 'Slot updated', slot: updatedSlot });
  } catch (error) {
    console.error('Update slot error:', error);
    res.status(500).json({ error: 'Failed to update slot' });
  }
});

// Delete slot (instructor only, if not booked)
router.delete('/:id', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;

    // Get existing slot
    const slot = db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(id);
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Check ownership
    if (slot.instructor_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this slot' });
    }

    // Check if booked
    const booking = db.prepare("SELECT id FROM appointments WHERE slot_id = ? AND status = 'scheduled'").get(id);
    if (booking) {
      return res.status(400).json({ error: 'Cannot delete a booked slot. Cancel the appointment first.' });
    }

    db.prepare('DELETE FROM availability_slots WHERE id = ?').run(id);

    logAction(req.user.id, 'SLOT_DELETED', 'availability_slot', id, { date: slot.date, time: `${slot.start_time}-${slot.end_time}` }, req);

    res.json({ message: 'Slot deleted' });
  } catch (error) {
    console.error('Delete slot error:', error);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

module.exports = router;
