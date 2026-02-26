const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../models/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const { addDays, format, getDay, eachDayOfInterval } = require('date-fns');

const router = express.Router();

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Get my recurring patterns
router.get('/', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const patterns = db.prepare(`
      SELECT * FROM recurring_patterns 
      WHERE instructor_id = ? AND is_active = 1
      ORDER BY day_of_week, start_time
    `).all(req.user.id);

    const transformed = patterns.map(p => ({
      ...p,
      day_name: DAYS_OF_WEEK[p.day_of_week]
    }));

    res.json({ patterns: transformed });
  } catch (error) {
    console.error('Get recurring patterns error:', error);
    res.status(500).json({ error: 'Failed to fetch recurring patterns' });
  }
});

// Create recurring pattern
router.post('/', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { 
      day_of_week, start_time, end_time, location, 
      meeting_type = 'either', buffer_minutes = 0, slot_duration = 30,
      notes, start_date, end_date, generate_slots = true
    } = req.body;

    if (day_of_week === undefined || day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({ error: 'Valid day_of_week (0-6) is required' });
    }
    if (!start_time || !end_time || start_time >= end_time) {
      return res.status(400).json({ error: 'Valid start_time and end_time required' });
    }
    if (!start_date) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    const existing = db.prepare(`
      SELECT id FROM recurring_patterns WHERE instructor_id = ? AND day_of_week = ? AND is_active = 1
      AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?) OR (start_time >= ? AND end_time <= ?))
    `).get(req.user.id, day_of_week, end_time, start_time, end_time, start_time, start_time, end_time);

    if (existing) {
      return res.status(409).json({ error: 'Overlapping recurring pattern exists' });
    }

    const patternId = uuidv4();
    db.prepare(`
      INSERT INTO recurring_patterns (id, instructor_id, day_of_week, start_time, end_time, location, meeting_type, buffer_minutes, notes, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patternId, req.user.id, day_of_week, start_time, end_time, location, meeting_type, buffer_minutes, notes, start_date, end_date || null);

    logAction(req.user.id, 'RECURRING_PATTERN_CREATED', 'recurring_pattern', patternId, { day_of_week, start_time, end_time }, req);

    let slotsCreated = 0;
    if (generate_slots) {
      slotsCreated = generateSlotsForPattern({
        id: patternId, instructor_id: req.user.id, day_of_week, start_time, end_time,
        location, meeting_type, buffer_minutes, notes, start_date, end_date
      }, slot_duration);
    }

    res.status(201).json({ message: 'Recurring pattern created', pattern_id: patternId, slots_created: slotsCreated });
  } catch (error) {
    console.error('Create recurring pattern error:', error);
    res.status(500).json({ error: 'Failed to create recurring pattern' });
  }
});

function generateSlotsForPattern(pattern, slotDuration = 30, weeksAhead = 8) {
  const startDate = new Date(pattern.start_date);
  const endDate = pattern.end_date ? new Date(pattern.end_date) : addDays(new Date(), weeksAhead * 7);
  const allDates = eachDayOfInterval({ start: startDate, end: endDate });
  const matchingDates = allDates.filter(d => getDay(d) === pattern.day_of_week);

  const insertSlot = db.prepare(`
    INSERT OR IGNORE INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type, notes, recurring_pattern_id, buffer_after)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let created = 0;
  const [startHour, startMin] = pattern.start_time.split(':').map(Number);
  const [endHour, endMin] = pattern.end_time.split(':').map(Number);
  const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
  const effectiveDuration = slotDuration + (pattern.buffer_minutes || 0);
  const slotsPerDay = Math.floor(totalMinutes / effectiveDuration);

  for (const date of matchingDates) {
    if (date < new Date()) continue;
    const dateStr = format(date, 'yyyy-MM-dd');

    for (let i = 0; i < slotsPerDay; i++) {
      const slotStartMinutes = (startHour * 60 + startMin) + (i * effectiveDuration);
      const slotEndMinutes = slotStartMinutes + slotDuration;
      const slotStart = `${Math.floor(slotStartMinutes / 60).toString().padStart(2, '0')}:${(slotStartMinutes % 60).toString().padStart(2, '0')}`;
      const slotEnd = `${Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;

      try {
        insertSlot.run(uuidv4(), pattern.instructor_id, dateStr, slotStart, slotEnd, pattern.location, pattern.meeting_type, pattern.notes, pattern.id, pattern.buffer_minutes || 0);
        created++;
      } catch (e) { /* Slot exists */ }
    }
  }
  return created;
}

router.post('/:id/generate', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { slot_duration = 30, weeks_ahead = 8 } = req.body;
    const pattern = db.prepare('SELECT * FROM recurring_patterns WHERE id = ? AND instructor_id = ?').get(id, req.user.id);
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

    const slotsCreated = generateSlotsForPattern(pattern, slot_duration, weeks_ahead);
    logAction(req.user.id, 'SLOTS_GENERATED', 'recurring_pattern', id, { slots_created: slotsCreated }, req);
    res.json({ message: `Generated ${slotsCreated} slots`, slots_created: slotsCreated });
  } catch (error) {
    console.error('Generate slots error:', error);
    res.status(500).json({ error: 'Failed to generate slots' });
  }
});

router.put('/:id', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { location, meeting_type, buffer_minutes, notes, end_date } = req.body;
    const pattern = db.prepare('SELECT * FROM recurring_patterns WHERE id = ? AND instructor_id = ?').get(id, req.user.id);
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

    const updates = [], params = [];
    if (location !== undefined) { updates.push('location = ?'); params.push(location); }
    if (meeting_type) { updates.push('meeting_type = ?'); params.push(meeting_type); }
    if (buffer_minutes !== undefined) { updates.push('buffer_minutes = ?'); params.push(buffer_minutes); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    db.prepare(`UPDATE recurring_patterns SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    logAction(req.user.id, 'RECURRING_PATTERN_UPDATED', 'recurring_pattern', id, req.body, req);
    res.json({ message: 'Pattern updated' });
  } catch (error) {
    console.error('Update pattern error:', error);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

router.delete('/:id', authenticateToken, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const { delete_future_slots } = req.query;
    const pattern = db.prepare('SELECT * FROM recurring_patterns WHERE id = ? AND instructor_id = ?').get(id, req.user.id);
    if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

    db.prepare('UPDATE recurring_patterns SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    let slotsDeleted = 0;
    if (delete_future_slots === 'true') {
      const result = db.prepare(`
        DELETE FROM availability_slots WHERE recurring_pattern_id = ? AND date >= date('now')
        AND id NOT IN (SELECT slot_id FROM appointments WHERE status = 'scheduled')
      `).run(id);
      slotsDeleted = result.changes;
    }

    logAction(req.user.id, 'RECURRING_PATTERN_DELETED', 'recurring_pattern', id, { slots_deleted: slotsDeleted }, req);
    res.json({ message: 'Pattern deleted', slots_deleted: slotsDeleted });
  } catch (error) {
    console.error('Delete pattern error:', error);
    res.status(500).json({ error: 'Failed to delete pattern' });
  }
});

module.exports = router;
