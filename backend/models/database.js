const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Simple query wrapper
const db = {
  query: (text, params) => pool.query(text, params),
  
  // Get single row
  async get(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows[0];
  },
  
  // Get all rows
  async all(sql, params = []) {
    const result = await pool.query(sql, params);
    return result.rows;
  },
  
  // Run insert/update/delete
  async run(sql, params = []) {
    const result = await pool.query(sql, params);
    return { changes: result.rowCount, lastID: result.rows[0]?.id };
  }
};

async function initializeDatabase() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'student',
        department VARCHAR(255),
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability_slots (
        id VARCHAR(255) PRIMARY KEY,
        instructor_id VARCHAR(255) REFERENCES users(id),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        location VARCHAR(255),
        meeting_type VARCHAR(50) DEFAULT 'either',
        notes TEXT,
        recurring_pattern_id VARCHAR(255),
        buffer_after INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id VARCHAR(255) PRIMARY KEY,
        slot_id VARCHAR(255),
        student_id VARCHAR(255),
        instructor_id VARCHAR(255),
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        meeting_type VARCHAR(50),
        location VARCHAR(255),
        meeting_link VARCHAR(255),
        topic VARCHAR(255),
        notes TEXT,
        cancelled_by VARCHAR(255),
        cancellation_reason TEXT,
        cancelled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        type VARCHAR(255),
        title VARCHAR(255),
        message TEXT,
        link VARCHAR(255),
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        action VARCHAR(255),
        entity_type VARCHAR(255),
        entity_id VARCHAR(255),
        details TEXT,
        ip_address VARCHAR(255),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS recurring_patterns (
        id VARCHAR(255) PRIMARY KEY,
        instructor_id VARCHAR(255),
        day_of_week INTEGER,
        start_time TIME,
        end_time TIME,
        location VARCHAR(255),
        meeting_type VARCHAR(50) DEFAULT 'either',
        buffer_minutes INTEGER DEFAULT 0,
        notes TEXT,
        start_date DATE,
        end_date DATE,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id VARCHAR(255) PRIMARY KEY,
        slot_id VARCHAR(255),
        student_id VARCHAR(255),
        position INTEGER,
        notified INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        token TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create demo users if they don't exist
    await createDemoUsers();
    
    console.log('✅ PostgreSQL initialized');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

async function createDemoUsers() {
  const users = [
    { email: 'admin@university.edu', password: 'admin123', first_name: 'System', last_name: 'Administrator', role: 'admin', department: 'IT Services' },
    { email: 'prof.smith@university.edu', password: 'instructor123', first_name: 'Sarah', last_name: 'Smith', role: 'instructor', department: 'Computer Science' },
    { email: 'prof.johnson@university.edu', password: 'instructor123', first_name: 'Michael', last_name: 'Johnson', role: 'instructor', department: 'Mathematics' },
    { email: 'student@university.edu', password: 'student123', first_name: 'Alex', last_name: 'Student', role: 'student', department: 'Computer Science' }
  ];

  for (const user of users) {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
    if (exists.rows.length === 0) {
      await pool.query(
        'INSERT INTO users (id, email, password, first_name, last_name, role, department) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [uuidv4(), user.email, bcrypt.hashSync(user.password, 10), user.first_name, user.last_name, user.role, user.department]
      );
      console.log(`Created user: ${user.email}`);
    }
  }

  // Create demo slots
  const instructors = await pool.query("SELECT id FROM users WHERE role = 'instructor'");
  const today = new Date();
  
  for (const instructor of instructors.rows) {
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        const dateStr = date.toISOString().split('T')[0];
        const times = [['09:00','09:30'],['09:30','10:00'],['10:00','10:30'],['14:00','14:30'],['14:30','15:00']];
        for (const [start, end] of times) {
          const slotExists = await pool.query(
            'SELECT id FROM availability_slots WHERE instructor_id = $1 AND date = $2 AND start_time = $3',
            [instructor.id, dateStr, start]
          );
          if (slotExists.rows.length === 0) {
            await pool.query(
              'INSERT INTO availability_slots (id, instructor_id, date, start_time, end_time, location, meeting_type) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [uuidv4(), instructor.id, dateStr, start, end, 'Room 301', 'either']
            );
          }
        }
      }
    }
  }
}

module.exports = { db, pool, initializeDatabase };
