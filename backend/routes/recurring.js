const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// Split a time range into individual slots of slotDuration minutes, separated by bufferMins
function splitTimeRange(startTime, endTime, slotDuration, bufferMins) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const endTotal = eh * 60 + em;
  const slots = [];
  let cur = sh * 60 + sm;

  while (cur + slotDuration <= endTotal) {
    const slotEnd = cur + slotDuration;
    slots.push({
      start: `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`,
      end: `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`
    });
    cur = slotEnd + bufferMins;
  }
  return slots;
}

// Generate individual availability slots from a pattern
async function generateSlotsForPattern(patternId, instructorId, weekAhead = 8) {
  const patternResult = await pool.query(
    'SELECT * FROM recurring_patterns WHERE id = $1 AND instructor_id = $2 AND is_active = 1',
    [patternId, instructorId]
  );
  if (patternResult.rows.length === 0) return 0;

  const p = patternResult.rows[0];
  const slotDuration = p.slot_duration || 30;
  const bufferMins = p.buffer_minutes || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endLimit = p.end_date
    ? new Date(p.end_date)
    : new Date(today.getTime() + weekAhead * 7 * 24 * 60 * 60 * 1000);
  const startFrom = p.start_date
    ? new Date(Math.max(new Date(p.start_date), today))
    : today;

  const timeSlots = splitTimeRange(p.start_time, p.end_time, slotDuration, bufferMins);
  if (timeSlots.length === 0) return 0;

  let created = 0;
  const cursor = new Date(startFrom);

  while (cursor <= endLimit) {
    if (cursor.getDay() === parseInt(p.day_of_week)) {
      const dateStr = cursor.toISOString().split('T')[0];

      for (const ts of timeSlots) {
        const slotDateTime = new Date(`${dateStr}T${ts.start}`);
        if (slotDateTime <= new Date()) continue; // skip past slots

        // Skip if slot already exists at this time
        const exists = await pool.query(
          'SELECT id FROM availability_slots WHERE instructor_id = $1 AND date = $2 AND start_time = $3',
          [instructorId, dateStr, ts.start]
        );
        if (exists.rows.length > 0) continue;

        await pool.query(
          `INSERT INTO availability_slots
           (id, instructor_id, date, start_time, end_time, location, meeting_type, notes, recurring_pattern_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
          [uuidv4(), instructorId, dateStr, ts.start, ts.end, p.location, p.meeting_type, p.notes, patternId]
        );
        created++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return created;
}

// Get patterns
router.get('/', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM recurring_patterns WHERE instructor_id = $1 AND is_active = 1 ORDER BY day_of_week',
      [req.user.userId]
    );
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns = result.rows.map(p => ({ ...p, day_name: days[p.day_of_week] }));
    res.json({ patterns });
  } catch (error) {
    console.error('Get patterns error:', error);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

// Create pattern
router.post('/', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { day_of_week, start_time, end_time, location, meeting_type, buffer_minutes, slot_duration, start_date, end_date, generate_slots } = req.body;

    if (day_of_week === undefined || !start_time || !end_time || !start_date) {
      return res.status(400).json({ error: 'Missing required fields: day_of_week, start_time, end_time, start_date' });
    }

    const patternId = uuidv4();

    await pool.query(
      `INSERT INTO recurring_patterns
       (id, instructor_id, day_of_week, start_time, end_time, location, meeting_type, buffer_minutes, slot_duration, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        patternId,
        req.user.userId,
        parseInt(day_of_week),
        start_time,
        end_time,
        location || null,
        meeting_type || 'either',
        buffer_minutes || 0,
        slot_duration || 30,
        start_date,
        end_date || null
      ]
    );

    let slotsCreated = 0;
    if (generate_slots) {
      slotsCreated = await generateSlotsForPattern(patternId, req.user.userId, 8);
    }

    res.status(201).json({ message: 'Pattern created', pattern_id: patternId, slots_created: slotsCreated });
  } catch (error) {
    console.error('Create pattern error:', error);
    res.status(500).json({ error: 'Failed to create pattern: ' + error.message });
  }
});

// Update pattern
router.put('/:id', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { location, meeting_type, buffer_minutes, end_date } = req.body;
    await pool.query(
      'UPDATE recurring_patterns SET location = $1, meeting_type = $2, buffer_minutes = $3, end_date = $4 WHERE id = $5 AND instructor_id = $6',
      [location, meeting_type, buffer_minutes, end_date, req.params.id, req.user.userId]
    );
    res.json({ message: 'Pattern updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

// Delete pattern
router.delete('/:id', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { delete_future_slots } = req.query;
    if (delete_future_slots === 'true') {
      const today = new Date().toISOString().split('T')[0];
      await pool.query(
        'DELETE FROM availability_slots WHERE recurring_pattern_id = $1 AND instructor_id = $2 AND date >= $3',
        [req.params.id, req.user.userId, today]
      );
    }
    await pool.query(
      'UPDATE recurring_patterns SET is_active = 0 WHERE id = $1 AND instructor_id = $2',
      [req.params.id, req.user.userId]
    );
    res.json({ message: 'Pattern deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete pattern' });
  }
});

// Generate slots from pattern (also used by the ↺ button)
router.post('/:id/generate', authenticateToken, authorize('instructor', 'admin'), async (req, res) => {
  try {
    const { weeks_ahead = 8 } = req.body;
    const slotsCreated = await generateSlotsForPattern(req.params.id, req.user.userId, parseInt(weeks_ahead));
    res.json({ message: `Generated ${slotsCreated} new slots`, slots_created: slotsCreated });
  } catch (error) {
    console.error('Generate slots error:', error);
    res.status(500).json({ error: 'Failed to generate slots: ' + error.message });
  }
});

module.exports = router;
