const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase } = require('./models/database');
const emailService = require('./utils/emailService');
const { initializeReminderScheduler } = require('./utils/reminderScheduler');

// Initialize database
initializeDatabase();

// Initialize email service
emailService.initialize().then(() => {
  console.log('📧 Email service initialized');
}).catch(err => {
  console.warn('⚠️  Email service failed to initialize:', err.message);
});

// Initialize reminder scheduler
initializeReminderScheduler();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin.includes(',') ? corsOrigin.split(',') : corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Request logging (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Routes
const authRoutes = require('./routes/auth');
const slotsRoutes = require('./routes/slots');
const appointmentsRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const recurringRoutes = require('./routes/recurring');
const waitlistRoutes = require('./routes/waitlist');
const calendarRoutes = require('./routes/calendar');
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/notifications', notificationsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     Office Hours Booking Platform - API Server        ║
╠═══════════════════════════════════════════════════════╣
║  Server running on http://localhost:${PORT}              ║
║  Environment: ${process.env.NODE_ENV || 'development'}                          ║
║  Database: SQLite (local)                             ║
╚═══════════════════════════════════════════════════════╝

Demo Credentials:
  Admin:      admin@university.edu / admin123
  Instructor: prof.smith@university.edu / instructor123
  Student:    student@university.edu / student123
  `);
});

module.exports = app;
