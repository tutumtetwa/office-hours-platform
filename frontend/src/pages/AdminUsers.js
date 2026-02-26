import React, { useState } from 'react';
import { useUsers } from '../hooks/useData';
import { adminAPI } from '../utils/api';
import { Users, Plus, Edit2, UserX, UserCheck, Search } from 'lucide-react';
import { 
  PageHeader, Card, Spinner, Modal, FormInput, FormSelect, 
  Alert, RoleBadge, EmptyState 
} from '../components/UI';
import { formatDate } from '../utils/dateUtils';

const AdminUsers = () => {
  const [filters, setFilters] = useState({ role: '', search: '' });
  const { users, loading, refetch } = useUsers(filters);
  
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '', password: '', first_name: '', last_name: '', role: 'student', department: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openCreateModal = () => {
    setFormData({ email: '', password: '', first_name: '', last_name: '', role: 'student', department: '' });
    setError('');
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
      await adminAPI.createUser(formData);
      setSuccess('User created successfully');
      setCreateModal(false);
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setActionLoading(false);
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
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <FormSelect
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
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
                      <td><strong>{user.first_name} {user.last_name}</strong></td>
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
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(user)}>
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-ghost btn-sm" 
                            onClick={() => handleToggleActive(user)}
                            style={{ color: user.is_active ? 'var(--color-error)' : 'var(--color-success)' }}
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
          )}
        </Card>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Add New User" footer={
        <>
          <button className="btn btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={actionLoading}>
            {actionLoading ? <Spinner size={18} /> : 'Create User'}
          </button>
        </>
      }>
        {error && <Alert type="error">{error}</Alert>}
        <div className="form-row">
          <FormInput label="First Name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
          <FormInput label="Last Name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
        </div>
        <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        <FormInput label="Password" type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
        <div className="form-row">
          <FormSelect label="Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} options={[
            { value: 'student', label: 'Student' },
            { value: 'instructor', label: 'Instructor' },
            { value: 'admin', label: 'Admin' }
          ]} />
          <FormInput label="Department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
        </div>
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
          <FormInput label="First Name" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required />
          <FormInput label="Last Name" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required />
        </div>
        <FormInput label="Email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        <div className="form-row">
          <FormSelect label="Role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} options={[
            { value: 'student', label: 'Student' },
            { value: 'instructor', label: 'Instructor' },
            { value: 'admin', label: 'Admin' }
          ]} />
          <FormInput label="Department" value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})} />
        </div>
      </Modal>
    </>
  );
};

export default AdminUsers;
