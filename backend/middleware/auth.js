const jwt = require('jsonwebtoken');
const { db } = require('../models/database');
const { logAction } = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Authenticate token middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session exists and is valid
    const session = db.prepare(`
      SELECT * FROM sessions 
      WHERE token = ? AND user_id = ? AND expires_at > datetime('now')
    `).get(token, decoded.userId);

    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Update session expiry (sliding window)
    const newExpiry = new Date(Date.now() + SESSION_TIMEOUT).toISOString();
    db.prepare('UPDATE sessions SET expires_at = ? WHERE token = ?').run(newExpiry, token);

    // Get user details
    const user = db.prepare('SELECT id, email, first_name, last_name, role, department FROM users WHERE id = ? AND is_active = 1').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logAction(null, 'AUTH_FAILED', 'session', null, { error: error.message }, req);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Role-based access control middleware
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      logAction(req.user.id, 'UNAUTHORIZED_ACCESS', 'permission', null, { 
        requiredRoles: roles, 
        userRole: req.user.role,
        path: req.path 
      }, req);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Check if user owns resource or is admin
function authorizeOwnerOrAdmin(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const ownerId = typeof getOwnerId === 'function' ? getOwnerId(req) : req.params[getOwnerId];
    
    if (req.user.id !== ownerId) {
      logAction(req.user.id, 'UNAUTHORIZED_ACCESS', 'resource', ownerId, { 
        path: req.path 
      }, req);
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorize,
  authorizeOwnerOrAdmin,
  JWT_SECRET,
  SESSION_TIMEOUT
};
