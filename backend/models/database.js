const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Use PostgreSQL in production, SQLite locally
const isProduction = process.env.DATABASE_URL;

let pool;
let db;

if (isProduction) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  // Create a wrapper to match SQLite-like interface
  db = {
    prepare: (sql) => ({
      run: async (...params) => {
        const result = await pool.query(convertSQL(sql), params);
        return { changes: result.rowCount };
      },
      get: async (...params) => {
        const result = await pool.query(convertSQL(sql), params);
        return result.rows[0];
      },
      all: async (...params) => {
        const result = await pool.query(convertSQL(sql), params);
        return result.rows;
      }
    }),
    exec: async (sql) => {
      await pool.query(sql);
    }
  };
} else {
  // Fallback to SQLite for local development
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
  db = sqliteDb;
}

// Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertSQL(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`)
    .replace(/INTEGER PRIMARY KEY/gi, 'SERIAL PRIMARY KEY')
    .replace(/AUTOINCREMENT/gi, '')
    .replace(/TEXT/gi, 'VARCHAR(255)')
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/date\('now'\)/gi, 'CURRENT_DATE')
    .replace(/CURRENT_TIMESTAMP/gi, 'NOW()');
}

async function initializeDatabase() {
  if (isProduction) {
    await initializePostgres();
  } else {
    initializeSQLite();
  }
}

async function initializePostgres() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) CHECK(role IN ('student', 'instructor', 'admin')) NOT NULL DEFAULT 'student',
        department VARCHAR(255),
        email_notifications INTEGER DEFAULT 1,
        reminder_24h INTEGER DEFAULT 1,
        reminder_1h INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_patterns (
        id VARCHAR(255) PRIMARY KEY,
        instructor_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location VARCHAR(255),
        meeting_type VARCHAR(50) CHECK(meeting_type IN ('in-person', 'virtual', 'either')) DEFAULT 'either',
        buffer_minutes INTEGER DEFAULT 0,
        notes TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability_slots (
        id VARCHAR(255) PRIMARY KEY,
        instructor_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location VARCHAR(255),
        meeting_type VARCHAR(50) CHECK(meeting_type IN ('in-person', 'virtual', 'either')) DEFAULT 'either',
        notes TEXT,
        recurring_pattern_id VARCHAR(255) REFERENCES recurring_patterns(id) ON DELETE SET NULL,
        buffer_after INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(instructor_id, date, start_time, end_time)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id VARCHAR(255) PRIMARY KEY,
        slot_id VARCHAR(255) NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
        student_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        notified INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(slot_id, student_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255),
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(255) PRIMARY KEY,
        slot_id VARCHAR(255) NOT NULL,
        student_id VARCHAR(255) NOT NULL,
        instructor_id VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(50) CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no-show')) DEFAULT 'scheduled',
        meeting_type VARCHAR(50) CHECK(meeting_type IN ('in-person', 'virtual')) NOT NULL,
        location VARCHAR(255),
        meeting_link VARCHAR(255),
        topic VARCHAR(255),
        notes TEXT,
        cancelled_by VARCHAR(255),
        cancellation_reason TEXT,
        cancelled_at TIMESTAMP,
        reminder_24h_sent TIMESTAMP,
        reminder_1h_sent TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(255),
        entity_id VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(255),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create demo users
    await createDemoUsersPostgres();
    
    console.log('✅ PostgreSQL database initialized');
  } catch (error) {
    console.error('PostgreSQL initialization error:', error);
  }
}

async function createDemoUsersPostgres() {
  const users = [
    { email: 'admin@university.edu', password: 'admin123', first_name: 'System', last_name: 'Administrator', role: 'admin', department: 'IT Services' },
    { email: 'prof.smith@university.edu', password: 'instructor123', first_name: 'Sarah', last_name: 'Smith', role: 'instructor', department: 'Computer Science' },
    { email: 'prof.johnson@university.edu', password: 'instructor123', first_name: 'Michael', last_name: 'Johnson', role: 'instructor', department: 'Mathematics' },
    { email: 'student@university.edu', password: 'student123', first_name: 'Alex', last_name: 'Student', role: 'student', department: 'Computer Science' }
  ];

  for (const user of users) {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
    if (exists.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync(user.password, 10);
      await pool.query(
        'INSERT INTO users (id, email, password, first_name, last_name, role, department) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [uuidv4(), user.email, hashedPassword, user.first_name, user.last_name, user.role, user.department]
      );
    }
  }

  // Create demo slots for instructors
  const instructors = await pool.query("SELECT id FROM users WHERE role = 'instructor'");
  const today = new Date();
  
  for (const instructor of instructors.rows) {
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        const dateStr = date.toISOString().split('T')[0];
        const slots = [
          { start: '09:00', end: '09:30' },
          { start: '09:30', end: '10:00' },
          { start: '10:00', end: '10:30' },
          { start: '14:00', end: '14:30' },
          { start: '14:30', end: '15:00' }
        ];
        for (const slot of slots) {
          try {
            await pool.query(
              'INSERT INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
              [uuidv4(), instructor.id, dateStr, slot.start, slot.end, 'Room 301', 'either']
            );
          } catch (e) { /* ignore duplicates */ }
        }
      }
    }
  }
}

function initializeSQLite() {
  // Original SQLite code for local development
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');

  sqliteDb.exec(`
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

  // ... (keep other SQLite table creations)
  console.log('✅ SQLite database initialized');
}

module.exports = { db, pool, initializeDatabase };
