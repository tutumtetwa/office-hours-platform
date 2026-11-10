const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase } = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the platform proxy (Vercel) so rate limiting sees real client IPs
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting — general API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limits for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/password-reset/request', authLimiter);
app.use('/api/password-reset/send-code', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api/auth/verify-email', authLimiter);
app.use('/api/auth/setup-password', authLimiter);
app.use('/api/password-reset/verify-code', authLimiter);
app.use('/api/password-reset/reset', authLimiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.1.0'
  });
});

// Run migrations/seed once per instance before serving any DB-backed route
let dbReady;
app.use((req, res, next) => {
  dbReady = dbReady || initializeDatabase();
  dbReady.then(() => next()).catch((err) => { dbReady = null; next(err); });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/slots', require('./routes/slots'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/recurring', require('./routes/recurring'));
app.use('/api/waitlist', require('./routes/waitlist'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Local development: start a server. On Vercel the exported app is the handler.
if (require.main === module && !process.env.VERCEL) {
  initializeDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => console.log(`Office Hours API listening on http://localhost:${PORT}`));
  });
}

module.exports = app;
