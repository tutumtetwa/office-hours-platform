import React from 'react';
import { X, Loader2, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

// Loading Spinner
export const Spinner = ({ size = 24, className = '' }) => (
  <Loader2 
    size={size} 
    className={`spinner ${className}`} 
    style={{ animation: 'spin 0.8s linear infinite' }} 
  />
);

// Loading Overlay
export const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="loading-overlay">
    <div style={{ textAlign: 'center' }}>
      <Spinner size={32} />
      <p className="mt-md text-secondary">{message}</p>
    </div>
  </div>
);

// Modal Component
export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeStyles = {
    sm: { maxWidth: '400px' },
    md: { maxWidth: '500px' },
    lg: { maxWidth: '700px' },
    xl: { maxWidth: '900px' }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        style={sizeStyles[size]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Alert Component
export const Alert = ({ type = 'info', title, children, onClose }) => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle
  };
  
  const Icon = icons[type];

  return (
    <div className={`alert alert-${type}`} style={{
      padding: 'var(--space-md) var(--space-lg)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      gap: 'var(--space-md)',
      alignItems: 'flex-start',
      background: `var(--color-${type === 'error' ? 'error' : type}-bg)`,
      border: `1px solid var(--color-${type === 'error' ? 'error' : type})`,
      marginBottom: 'var(--space-lg)'
    }}>
      <Icon size={20} style={{ color: `var(--color-${type === 'error' ? 'error' : type})`, flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        {title && <strong style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>{title}</strong>}
        <div style={{ color: 'var(--color-text-secondary)' }}>{children}</div>
      </div>
      {onClose && (
        <button onClick={onClose} style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer',
          padding: 'var(--space-xs)',
          color: 'var(--color-text-muted)'
        }}>
          <X size={16} />
        </button>
      )}
    </div>
  );
};

// Badge Component
export const Badge = ({ variant = 'primary', children }) => (
  <span className={`badge badge-${variant}`}>
    {children}
  </span>
);

// Role Badge
export const RoleBadge = ({ role }) => (
  <span className={`role-badge ${role}`}>
    {role}
  </span>
);

// Status Badge for appointments
export const StatusBadge = ({ status }) => {
  const variants = {
    scheduled: 'primary',
    completed: 'success',
    cancelled: 'error',
    'no-show': 'warning'
  };

  return <Badge variant={variants[status] || 'neutral'}>{status}</Badge>;
};

// Empty State Component
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="empty-state">
    {Icon && <Icon size={64} />}
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);

// Card Component
export const Card = ({ title, action, children, className = '' }) => (
  <div className={`card ${className}`}>
    {(title || action) && (
      <div className="card-header">
        {title && <h3 className="card-title">{title}</h3>}
        {action}
      </div>
    )}
    <div className="card-body">
      {children}
    </div>
  </div>
);

// Stat Card Component
export const StatCard = ({ icon: Icon, value, label, variant = 'primary' }) => (
  <div className="stat-card">
    <div className={`stat-icon ${variant}`}>
      <Icon size={24} />
    </div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

// Confirmation Dialog
export const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmVariant = 'primary', loading = false }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    footer={
      <>
        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button 
          className={`btn btn-${confirmVariant}`} 
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <Spinner size={18} /> : confirmText}
        </button>
      </>
    }
  >
    <p>{message}</p>
  </Modal>
);

// Form Input Component
export const FormInput = ({ 
  label, 
  type = 'text', 
  error, 
  hint, 
  required, 
  ...props 
}) => (
  <div className="form-group">
    {label && (
      <label className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
    )}
    <input 
      type={type} 
      className={`form-input ${error ? 'error' : ''}`}
      {...props}
    />
    {error && <div className="form-error">{error}</div>}
    {hint && !error && <div className="form-hint">{hint}</div>}
  </div>
);

// Form Select Component
export const FormSelect = ({ 
  label, 
  options, 
  error, 
  hint, 
  required,
  placeholder,
  ...props 
}) => (
  <div className="form-group">
    {label && (
      <label className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
    )}
    <select 
      className={`form-select ${error ? 'error' : ''}`}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <div className="form-error">{error}</div>}
    {hint && !error && <div className="form-hint">{hint}</div>}
  </div>
);

// Form Textarea Component
export const FormTextarea = ({ 
  label, 
  error, 
  hint, 
  required, 
  rows = 3,
  ...props 
}) => (
  <div className="form-group">
    {label && (
      <label className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
    )}
    <textarea 
      className={`form-textarea ${error ? 'error' : ''}`}
      rows={rows}
      {...props}
    />
    {error && <div className="form-error">{error}</div>}
    {hint && !error && <div className="form-hint">{hint}</div>}
  </div>
);

// Avatar Component
export const Avatar = ({ name, size = 40, className = '' }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div 
      className={`user-avatar ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
};

// Page Header Component
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="page-header">
    <div>
      <h1>{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {action}
  </div>
);
