const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('student', 'instructor', 'admin')) NOT NULL DEFAULT 'student',
      department TEXT,
      email_notifications INTEGER DEFAULT 1,
      reminder_24h INTEGER DEFAULT 1,
      reminder_1h INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Recurring availability patterns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_patterns (
      id TEXT PRIMARY KEY,
      instructor_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      location TEXT,
      meeting_type TEXT CHECK(meeting_type IN ('in-person', 'virtual', 'either')) DEFAULT 'either',
      buffer_minutes INTEGER DEFAULT 0,
      notes TEXT,
      start_date DATE NOT NULL,
      end_date DATE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Availability slots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS availability_slots (
      id TEXT PRIMARY KEY,
      instructor_id TEXT NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      location TEXT,
      meeting_type TEXT CHECK(meeting_type IN ('in-person', 'virtual', 'either')) DEFAULT 'either',
      notes TEXT,
      recurring_pattern_id TEXT,
      buffer_after INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recurring_pattern_id) REFERENCES recurring_patterns(id) ON DELETE SET NULL,
      UNIQUE(instructor_id, date, start_time, end_time)
    )
  `);

  // Waitlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(slot_id, student_id)
    )
  `);

  // Notifications table for in-app notifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Appointments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      instructor_id TEXT NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      status TEXT CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show')) DEFAULT 'scheduled',
      meeting_type TEXT CHECK(meeting_type IN ('in-person', 'virtual')) NOT NULL,
      location TEXT,
      meeting_link TEXT,
      topic TEXT,
      notes TEXT,
      cancelled_by TEXT,
      cancellation_reason TEXT,
      cancelled_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (slot_id) REFERENCES availability_slots(id),
      FOREIGN KEY (student_id) REFERENCES users(id),
      FOREIGN KEY (instructor_id) REFERENCES users(id)
    )
  `);

  // Audit log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Sessions table for token management
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_slots_instructor ON availability_slots(instructor_id);
    CREATE INDEX IF NOT EXISTS idx_slots_date ON availability_slots(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_student ON appointments(student_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_instructor ON appointments(instructor_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_waitlist_slot ON waitlist(slot_id);
    CREATE INDEX IF NOT EXISTS idx_waitlist_student ON waitlist(student_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_recurring_instructor ON recurring_patterns(instructor_id);
  `);

  // Create demo users if they don't exist
  createDemoUsers();
}

function createDemoUsers() {
  const { v4: uuidv4 } = require('uuid');
  
  const users = [
    {
      id: uuidv4(),
      email: 'admin@university.edu',
      password: bcrypt.hashSync('admin123', 10),
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin',
      department: 'IT Services'
    },
    {
      id: uuidv4(),
      email: 'prof.smith@university.edu',
      password: bcrypt.hashSync('instructor123', 10),
      first_name: 'Sarah',
      last_name: 'Smith',
      role: 'instructor',
      department: 'Computer Science'
    },
    {
      id: uuidv4(),
      email: 'prof.johnson@university.edu',
      password: bcrypt.hashSync('instructor123', 10),
      first_name: 'Michael',
      last_name: 'Johnson',
      role: 'instructor',
      department: 'Mathematics'
    },
    {
      id: uuidv4(),
      email: 'student@university.edu',
      password: bcrypt.hashSync('student123', 10),
      first_name: 'Alex',
      last_name: 'Student',
      role: 'student',
      department: 'Computer Science'
    }
  ];

  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, role, department)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const user of users) {
    insertUser.run(user.id, user.email, user.password, user.first_name, user.last_name, user.role, user.department);
  }

  // Create demo availability slots for instructors
  const instructors = db.prepare("SELECT id FROM users WHERE role = 'instructor'").all();
  const insertSlot = db.prepare(`
    INSERT OR IGNORE INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  for (const instructor of instructors) {
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) { // Skip weekends
        const dateStr = date.toISOString().split('T')[0];
        // Morning slot
        insertSlot.run(uuidv4(), instructor.id, dateStr, '09:00', '09:30', 'Room 301', 'either');
        insertSlot.run(uuidv4(), instructor.id, dateStr, '09:30', '10:00', 'Room 301', 'either');
        insertSlot.run(uuidv4(), instructor.id, dateStr, '10:00', '10:30', 'Room 301', 'either');
        // Afternoon slot
        insertSlot.run(uuidv4(), instructor.id, dateStr, '14:00', '14:30', 'Room 301', 'either');
        insertSlot.run(uuidv4(), instructor.id, dateStr, '14:30', '15:00', 'Room 301', 'either');
      }
    }
  }
}

module.exports = { db, initializeDatabase };
