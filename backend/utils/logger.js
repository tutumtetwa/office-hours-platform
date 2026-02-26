const { db } = require('../models/database');
const { v4: uuidv4 } = require('uuid');

// Log an action to the audit log
function logAction(userId, action, entityType, entityId, details, req = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      userId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      req?.ip || req?.connection?.remoteAddress || null,
      req?.headers?.['user-agent'] || null
    );

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUDIT] ${new Date().toISOString()} | ${action} | User: ${userId || 'anonymous'} | ${entityType}:${entityId}`);
    }
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

// Get audit logs with filtering
function getAuditLogs(filters = {}) {
  let query = `
    SELECT al.*, u.email as user_email, u.first_name, u.last_name
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.userId) {
    query += ' AND al.user_id = ?';
    params.push(filters.userId);
  }

  if (filters.action) {
    query += ' AND al.action = ?';
    params.push(filters.action);
  }

  if (filters.entityType) {
    query += ' AND al.entity_type = ?';
    params.push(filters.entityType);
  }

  if (filters.startDate) {
    query += ' AND al.created_at >= ?';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ' AND al.created_at <= ?';
    params.push(filters.endDate);
  }

  query += ' ORDER BY al.created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  return db.prepare(query).all(...params);
}

module.exports = { logAction, getAuditLogs };
