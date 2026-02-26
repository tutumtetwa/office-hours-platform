import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Clock, Users, Settings, LogOut, LayoutDashboard,
  CalendarPlus, History, FileText, Menu, X, GraduationCap, Repeat, ListOrdered, Bell
} from 'lucide-react';
import { Avatar } from './UI';

const Layout = ({ children }) => {
  const { user, logout, isStudent, isInstructor, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const studentNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/book', icon: Calendar, label: 'Book Appointment' },
    { to: '/my-appointments', icon: Clock, label: 'My Appointments' },
    { to: '/waitlist', icon: ListOrdered, label: 'My Waitlist' },
  ];

  const instructorNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/availability', icon: CalendarPlus, label: 'My Availability' },
    { to: '/recurring', icon: Repeat, label: 'Recurring Hours' },
    { to: '/my-appointments', icon: Clock, label: 'Appointments' },
  ];

  const adminNav = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Manage Users' },
    { to: '/admin/logs', icon: FileText, label: 'Audit Logs' },
  ];

  const getNavItems = () => {
    if (isAdmin) return adminNav;
    if (isInstructor) return instructorNav;
    return studentNav;
  };

  const getIcon = (type) => {
    const icons = { booking_confirmed: '✅', new_booking: '📅', booking_cancelled: '❌', reminder: '⏰', waitlist_available: '🎉' };
    return icons[type] || '📢';
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
  };

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="sidebar-logo">
              <GraduationCap size={28} />
              <span>Office Hours</span>
            </div>
            
            {/* Notifications Bell */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotificationsOpen(!notificationsOpen)} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px',
                cursor: 'pointer', position: 'relative', color: 'white', display: 'flex'
              }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px', background: '#c9a227',
                    color: '#1e3a5f', borderRadius: '50%', width: '18px', height: '18px',
                    fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            </div>
          </div>
          <div className="sidebar-subtitle">Academic Scheduling</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {getNavItems().map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {(isStudent || isInstructor) && (
            <div className="nav-section">
              <div className="nav-section-title">History</div>
              <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <History size={20} />
                <span>Past Appointments</span>
              </NavLink>
            </div>
          )}

          <div className="nav-section">
            <div className="nav-section-title">Account</div>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
            <button className="nav-link" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
              <LogOut size={20} />
              <span>Log Out</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <Avatar name={`${user?.first_name} ${user?.last_name}`} size={40} />
            <div className="user-details">
              <div className="user-name">{user?.first_name} {user?.last_name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Notifications Panel */}
      {notificationsOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setNotificationsOpen(false)} />
          <div style={{
            position: 'fixed', top: '10px', left: '220px', width: '360px', background: 'white',
            borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 999, overflow: 'hidden'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#1e3a5f' }}>Notifications</strong>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#2d5a8a', fontSize: '13px', cursor: 'pointer' }}>
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>No notifications</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{
                    padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
                    background: n.is_read ? 'white' : '#f8f6f3', display: 'flex', gap: '12px'
                  }}>
                    <span style={{ fontSize: '20px' }}>{getIcon(n.type)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: n.is_read ? 'normal' : '600', color: '#1e3a5f', fontSize: '14px' }}>{n.title}</div>
                      <div style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>{n.message}</div>
                      <div style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>{formatTime(n.created_at)}</div>
                    </div>
                    {!n.is_read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#c9a227', marginTop: '6px' }} />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
