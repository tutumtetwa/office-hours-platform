import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { notificationsAPI } from '../utils/api';
import { formatDate } from '../utils/dateUtils';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getNotifications({ limit: 20 });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Fetch unread count periodically
  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(async () => {
      try {
        const response = await notificationsAPI.getUnreadCount();
        setUnreadCount(response.data.unread_count);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: 1 } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      'booking_confirmed': '✓',
      'booking_cancelled': '✕',
      'new_booking': '📅',
      'appointment_reminder': '⏰',
      'waitlist_available': '🎉'
    };
    return icons[type] || '📬';
  };

  return (
    <div className="notification-bell" ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-sm)',
          cursor: 'pointer',
          position: 'relative',
          color: 'rgba(255,255,255,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: 'var(--color-error)',
            color: 'white',
            fontSize: '0.6875rem',
            fontWeight: '600',
            borderRadius: 'var(--radius-full)',
            minWidth: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 'var(--space-sm)',
          width: '360px',
          maxHeight: '480px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          zIndex: 1000
        }}>
          {/* Header */}
          <div style={{
            padding: 'var(--space-md) var(--space-lg)',
            borderBottom: '1px solid rgba(30,58,95,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h4 style={{ margin: 0, color: 'var(--color-primary-dark)' }}>Notifications</h4>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: 'var(--space-2xl)',
                textAlign: 'center',
                color: 'var(--color-text-muted)'
              }}>
                <Bell size={32} style={{ opacity: 0.3, marginBottom: 'var(--space-sm)' }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) {
                      handleMarkAsRead(notification.id);
                    }
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                  }}
                  style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderBottom: '1px solid rgba(30,58,95,0.04)',
                    cursor: notification.link ? 'pointer' : 'default',
                    background: notification.is_read ? 'transparent' : 'rgba(30,58,95,0.03)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = notification.is_read ? 'transparent' : 'rgba(30,58,95,0.03)'}
                >
                  <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                    <span style={{ fontSize: '1.25rem' }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: notification.is_read ? 400 : 600,
                        fontSize: '0.9375rem',
                        color: 'var(--color-text)',
                        marginBottom: '2px'
                      }}>
                        {notification.title}
                      </div>
                      <div style={{
                        fontSize: '0.8125rem',
                        color: 'var(--color-text-secondary)',
                        marginBottom: '4px'
                      }}>
                        {notification.message}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)'
                      }}>
                        {formatDate(notification.created_at, 'MMM d, h:mm a')}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        flexShrink: 0,
                        marginTop: '6px'
                      }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
