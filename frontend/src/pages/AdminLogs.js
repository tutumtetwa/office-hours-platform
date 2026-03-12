import React, { useState } from 'react';
import { useAuditLogs } from '../hooks/useData';
import { FileText, Filter } from 'lucide-react';
import { PageHeader, Card, Spinner, FormInput, FormSelect, EmptyState } from '../components/UI';
import { formatDate } from '../utils/dateUtils';

const AdminLogs = () => {
  const [filters, setFilters] = useState({ action: '', limit: 100 });
  const { logs, loading, refetch } = useAuditLogs(filters);

  const actionTypes = [
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'USER_REGISTERED',
    'APPOINTMENT_BOOKED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_COMPLETED',
    'SLOT_CREATED', 'SLOT_UPDATED', 'SLOT_DELETED',
    'PROFILE_UPDATED', 'PASSWORD_CHANGED'
  ];

  const getActionColor = (action) => {
    if (action.includes('FAILED') || action.includes('CANCELLED')) return 'var(--color-error)';
    if (action.includes('SUCCESS') || action.includes('COMPLETED') || action.includes('CREATED')) return 'var(--color-success)';
    if (action.includes('UPDATED') || action.includes('CHANGED')) return 'var(--color-info)';
    return 'var(--color-text-secondary)';
  };

  return (
    <>
      <PageHeader title="Audit Logs" subtitle="System activity and security logs" />
      
      <div className="page-content">
        <Card className="mb-xl">
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ minWidth: '200px' }}>
              <FormSelect
                label="Action Type"
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                placeholder="All Actions"
                options={actionTypes.map(a => ({ value: a, label: a.replace(/_/g, ' ') }))}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <FormSelect
                label="Limit"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
                options={[
                  { value: 50, label: '50 entries' },
                  { value: 100, label: '100 entries' },
                  { value: 250, label: '250 entries' },
                  { value: 500, label: '500 entries' }
                ]}
              />
            </div>
            <button className="btn btn-secondary" onClick={refetch}>
              <Filter size={16} /> Apply
            </button>
          </div>
        </Card>

        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><Spinner /></div>
          ) : logs.length === 0 ? (
            <EmptyState icon={FileText} title="No logs found" description="No activity matching your filters." />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="text-sm">
                        {formatDate(log.created_at, 'MMM d, yyyy HH:mm:ss')}
                      </td>
                      <td>
                        <span style={{ 
                          color: getActionColor(log.action),
                          fontWeight: 500,
                          fontSize: '0.8125rem'
                        }}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {log.user_email ? (
                          <div>
                            <div className="text-sm">{log.first_name} {log.last_name}</div>
                            <div className="text-xs text-muted">{log.user_email}</div>
                          </div>
                        ) : (
                          <span className="text-muted">Anonymous</span>
                        )}
                      </td>
                      <td className="text-sm text-secondary" style={{ maxWidth: '300px' }}>
                        {log.details ? (
                          <code style={{ 
                            fontSize: '0.75rem', 
                            background: 'var(--color-bg)', 
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {JSON.stringify(JSON.parse(log.details), null, 0).slice(0, 100)}
                          </code>
                        ) : '—'}
                      </td>
                      <td className="text-sm text-muted">{log.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default AdminLogs;
