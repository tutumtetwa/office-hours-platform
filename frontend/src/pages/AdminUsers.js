import React, { useState } from 'react';
import { useUsers } from '../hooks/useData';
import { adminAPI } from '../utils/api';
import { Users, Plus, Edit2, UserX, UserCheck, Copy, Check, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  PageHeader, Card, Spinner, Modal, FormInput, FormSelect,
  Alert, RoleBadge, EmptyState
} from '../components/UI';
import { formatDate } from '../utils/dateUtils';

const AdminUsers = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ role: '', search: '' });
  const { users, pagination, loading, refetch } = useUsers({ ...filters, page, limit: 20 });

  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '', first_name: '', last_name: '', role: 'student', department: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPassword, setTempPassword] = useState(null);
  const [copied, setCopied] = useState(false);

  const openCreateModal = () => {
    setFormData({ email: '', first_name: '', last_name: '', role: 'student', department: '' });
    setError('');
    setTempPassword(null);
    setCreateModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      department: user.department || ''
    });
    setError('');
    setEditModal(true);
  };

  const handleCreate = async () => {
    setActionLoading(true);
    setError('');
    try {
      const response = await adminAPI.createUser(formData);
      const { temp_password } = response.data;
      setTempPassword(temp_password);
      refetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseCreateModal = () => {
    setCreateModal(false);
    setTempPassword(null);
    setCopied(false);
    if (tempPassword) {
      setSuccess('User created successfully. A welcome email with login instructions was sent.');
      setTimeout(() => setSuccess(''), 5000);
    }
  };

  const handleUpdate = async () => {
    setActionLoading(true);
    setError('');
    try {
      await adminAPI.updateUser(selectedUser.id, formData);
      setSuccess('User updated successfully');
      setEditModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    setActionLoading(true);
    try {
      if (user.is_active) {
        await adminAPI.deactivateUser(user.id);
        setSuccess('User deactivated');
      } else {
        await adminAPI.reactivateUser(user.id);
        setSuccess('User reactivated');
      }
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async (user) => {
    setActionLoading(true);
    try {
      const res = await adminAPI.resendInvite(user.id);
      setSuccess(`Invite resent to ${user.email}. New temp password: ${res.data.temp_password}`);
      setTimeout(() => setSuccess(''), 10000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value });
    setPage(1);
  };

  const handleRoleChange = (e) => {
    setFilters({ ...filters, role: e.target.value });
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Manage Users"
        subtitle="View and manage system users"
        action={
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> Add User
          </button>
        }
      />

      <div className="page-content">
        {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}
        {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

        <Card className="mb-xl">
          <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <FormInput
                placeholder="Search by name, email, or department..."
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            <FormSelect
              value={filters.role}
              onChange={handleRoleChange}
              placeholder="All Roles"
              options={[
                { value: 'student', label: 'Students' },
                { value: 'instructor', label: 'Instructors' },
                { value: 'admin', label: 'Admins' }
              ]}
            />
          </div>
        </Card>

        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}><Spinner /></div>
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description="Try adjusting your filters." />
          ) : (
            <>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.first_name} {user.last_name}</strong>
                          {user.must_change_password ? (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: 'var(--color-warning-bg)', color: 'var(--color-warning)', borderRadius: '4px', padding: '1px 6px' }}>
                              Setup Pending
                            </span>
                          ) : null}
                        </td>
                        <td>{user.email}</td>
                        <td><RoleBadge role={user.role} /></td>
                        <td>{user.department || '—'}</td>
                        <td>
                          <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm text-secondary">
                          {user.last_login ? formatDate(user.last_login, 'MMM d, yyyy') : 'Never'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(user)} title="Edit user">
                              <Edit2 size={14} />
                            </button>
                            {user.must_change_password && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleResendInvite(user)}
                                title="Resend invite email"
                                style={{ color: 'var(--color-info)' }}
                              >
                                <Mail size={14} />
                              </button>
                            )}
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleToggleActive(user)}
                              style={{ color: user.is_active ? 'var(--color-error)' : 'var(--color-success)' }}
                              title={user.is_active ? 'Deactivate' : 'Reactivate'}
                            >
                              {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    Showing {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage(p => p - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === pagination.pages || Math.abs(p - page) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) => p === '...' ? (
                        <span key={`ellipsis-${i}`} style={{ padding: '0 0.25rem', color: 'var(--color-text-muted)' }}>…</span>
                      ) : (
                        <button
                          key={p}
                          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ))
                    }
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page === pagination.pages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={handleCloseCreateModal} title="Add New User" footer={
        tempPassword ? (
          <button className="btn btn-primary" onClick={handleCloseCreateModal}>Done</button>
        ) : (
          <>
            <button className="btn btn-secondary" onClick={handleCloseCreateModal}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={actionLoading}>
              {actionLoading ? <Spinner size={18} /> : 'Create User'}
            </button>
          </>
        )
      }>
        {error && <Alert type="error">{error}</Alert>}

        {tempPassword ? (
          <div>
            <Alert type="success">
              User created successfully! A welcome email has been sent with login instructions.
            </Alert>
            <div style={{
              background: 'var(--color-bg)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                Temporary password (copy before closing):
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{
                  flex: 1,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--border-color)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '1.1rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  color: 'var(--color-primary)'
                }}>
                  {tempPassword}
                </code>
                <button
                  onClick={handleCopyPassword}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                The user will be required to change this password on first login.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="form-row">
              <FormInput label="First Name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
              <FormInput label="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
            </div>
            <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', marginTop: '-0.25rem' }}>
              A temporary password will be auto-generated and emailed to the user.
            </p>
            <div className="form-row">
              <FormSelect label="Role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} options={[
                { value: 'student', label: 'Student' },
                { value: 'instructor', label: 'Instructor' },
                { value: 'admin', label: 'Admin' }
              ]} />
              <FormInput label="Department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
          </>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal} onClose={() => setEditModal(false)} title="Edit User" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpdate} disabled={actionLoading}>
            {actionLoading ? <Spinner size={18} /> : 'Save Changes'}
          </button>
        </>
      }>
        {error && <Alert type="error">{error}</Alert>}
        <div className="form-row">
          <FormInput label="First Name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
          <FormInput label="Last Name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
        </div>
        <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        <div className="form-row">
          <FormSelect label="Role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} options={[
            { value: 'student', label: 'Student' },
            { value: 'instructor', label: 'Instructor' },
            { value: 'admin', label: 'Admin' }
          ]} />
          <FormInput label="Department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
        </div>
      </Modal>
    </>
  );
};

export default AdminUsers;
