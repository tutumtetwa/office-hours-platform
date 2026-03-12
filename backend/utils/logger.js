const { pool } = require('../models/database');
const { v4: uuidv4 } = require('uuid');

// Log an action to the audit log
async function logAction(userId, action, entityType, entityId, details, req = null) {
  try {
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req?.ip || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    await pool.query(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      uuidv4(),
      userId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      ip,
      userAgent
    ]);

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUDIT] ${new Date().toISOString()} | ${action} | User: ${userId || 'anonymous'} | ${entityType}:${entityId}`);
    }
  } catch (error) {
    console.error('Failed to log action:', error);
  }
}

// Get audit logs with filtering
async function getAuditLogs(filters = {}) {
  try {
    let query = `
      SELECT al.*, u.email as user_email, u.first_name, u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.userId) {
      query += ` AND al.user_id = $${paramIndex++}`;
      params.push(filters.userId);
    }

    if (filters.action) {
      query += ` AND al.action = $${paramIndex++}`;
      params.push(filters.action);
    }

    if (filters.entityType) {
      query += ` AND al.entity_type = $${paramIndex++}`;
      params.push(filters.entityType);
    }

    if (filters.startDate) {
      query += ` AND al.created_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND al.created_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    query += ' ORDER BY al.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    return [];
  }
}

module.exports = { logAction, getAuditLogs };