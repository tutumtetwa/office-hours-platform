import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner } from '../components/UI';
import api from '../utils/api';

const StatCard = ({ icon: Icon, value, label, variant = 'default' }) => {
  const colors = {
    default: { bg: 'var(--color-surface-hover)', icon: 'var(--color-primary)' },
    primary:  { bg: 'var(--color-info-bg)',      icon: 'var(--color-info)' },
    accent:   { bg: 'var(--color-warning-bg)',   icon: 'var(--color-accent)' },
    success:  { bg: 'var(--color-success-bg)',   icon: 'var(--color-success)' },
    error:    { bg: 'var(--color-error-bg)',      icon: 'var(--color-error)' },
  };
  const color = colors[variant] || colors.default;

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid rgba(30,58,95,0.06)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: color.bg, borderRadius: '12px', padding: '0.75rem', flexShrink: 0 }}>
          <Icon size={24} color={color.icon} />
        </div>
        <div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--color-text)' }}>{value}</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{label}</div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, isStudent, isInstructor, isAdmin } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const aptRes = await api.get('/appointments/my-appointments');
        setAppointments(aptRes.data.appointments || []);
        if (isAdmin) {
          const statsRes = await api.get('/admin/stats');
          setStats(statsRes.data);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Spinner size={48} />
      </div>
    );
  }

  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled');
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === today && a.status === 'scheduled');

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.75rem', background: 'var(--color-surface-hover)', borderRadius: '8px'
  };

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="page-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>System overview and management</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard icon={Users}        value={stats?.total_users || 0}               label="Total Users"        variant="primary" />
          <StatCard icon={Calendar}     value={stats?.total_appointments || 0}        label="Total Appointments" variant="accent" />
          <StatCard icon={CheckCircle}  value={stats?.completed_appointments || 0}    label="Completed"          variant="success" />
          <StatCard icon={XCircle}      value={stats?.cancelled_appointments || 0}    label="Cancelled"          variant="error" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <Card title="User Breakdown">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={rowStyle}>
                <span style={{ color: 'var(--color-text)' }}>Students</span>
                <strong style={{ color: 'var(--color-text)' }}>{stats?.total_students || 0}</strong>
              </div>
              <div style={rowStyle}>
                <span style={{ color: 'var(--color-text)' }}>Instructors</span>
                <strong style={{ color: 'var(--color-text)' }}>{stats?.total_instructors || 0}</strong>
              </div>
              <div style={rowStyle}>
                <span style={{ color: 'var(--color-text)' }}>Administrators</span>
                <strong style={{ color: 'var(--color-text)' }}>{stats?.total_admins || 0}</strong>
              </div>
              <div style={{ ...rowStyle, background: 'var(--color-success-bg)' }}>
                <span style={{ color: 'var(--color-success)' }}>Active Users</span>
                <strong style={{ color: 'var(--color-success)' }}>{stats?.active_users || 0}</strong>
              </div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/admin/users" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <Users size={18} /> Manage Users
              </Link>
              <Link to="/admin/logs" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
                <ArrowRight size={18} /> View Audit Logs
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Student/Instructor Dashboard
  return (
    <div className="page-content">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
          Welcome back, {user?.first_name}!
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>Manage your office hours appointments</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={Calendar} value={upcomingAppointments.length} label="Upcoming Appointments" variant="primary" />
        <StatCard icon={Clock}    value={todayAppointments.length}    label="Today's Appointments"  variant="accent" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card title="Upcoming Appointments" action={
          <Link to="/my-appointments" className="btn btn-ghost btn-sm">View All <ArrowRight size={16} /></Link>
        }>
          {upcomingAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
              <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <p>No upcoming appointments</p>
              {isStudent && (
                <Link to="/book" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Book an Appointment
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingAppointments.slice(0, 5).map(apt => (
                <div key={apt.id} style={{ padding: '0.75rem', background: 'var(--color-surface-hover)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--color-text)' }}>
                    {apt.is_instructor
                      ? `${apt.student?.first_name} ${apt.student?.last_name}`
                      : `${apt.instructor?.first_name} ${apt.instructor?.last_name}`}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    {new Date(apt.date).toLocaleDateString()} at {apt.start_time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Quick Actions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isStudent && (
              <Link to="/book" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <Calendar size={18} /> Book New Appointment
              </Link>
            )}
            {isInstructor && (
              <Link to="/availability" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <Calendar size={18} /> Manage Availability
              </Link>
            )}
            <Link to="/my-appointments" className="btn btn-secondary" style={{ justifyContent: 'center' }}>
              <Clock size={18} /> View My Appointments
            </Link>
            <Link to="/history" className="btn btn-ghost" style={{ justifyContent: 'center' }}>
              <ArrowRight size={18} /> View Past Appointments
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
