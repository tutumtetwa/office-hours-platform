import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, ArrowRight, CheckCircle, XCircle, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, Spinner } from '../components/UI';
import api from '../utils/api';

const StatCard = ({ icon: Icon, value, label, variant = 'default' }) => {
  const colors = {
    default: { bg: '#f8f6f3', icon: '#1e3a5f' },
    primary: { bg: '#e8f4f8', icon: '#2d5a8a' },
    accent: { bg: '#fdf6e3', icon: '#c9a227' },
    success: { bg: '#e8f5e9', icon: '#2e7d32' },
    error: { bg: '#ffebee', icon: '#c62828' }
  };
  const color = colors[variant] || colors.default;

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: color.bg, borderRadius: '12px', padding: '0.75rem' }}>
          <Icon size={24} color={color.icon} />
        </div>
        <div>
          <div style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1e3a5f' }}>{value}</div>
          <div style={{ fontSize: '0.875rem', color: '#666' }}>{label}</div>
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
        // Fetch appointments for all users
        const aptRes = await api.get('/appointments/my-appointments');
        setAppointments(aptRes.data.appointments || []);

        // Fetch admin stats if admin
        if (isAdmin) {
          const statsRes = await api.get('/admin/stats');
          console.log('Admin stats response:', statsRes.data);
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

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="page-content">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '0.5rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#666' }}>System overview and management</p>
        </div>

        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard icon={Users} value={stats?.total_users || stats?.totalUsers || stats?.users || 0} label="Total Users" variant="primary" />
          <StatCard icon={Calendar} value={stats?.total_appointments || stats?.totalAppointments || stats?.appointments || 0} label="Total Appointments" variant="accent" />
          <StatCard icon={CheckCircle} value={stats?.completed_appointments || stats?.completedAppointments || stats?.completed || 0} label="Completed" variant="success" />
          <StatCard icon={XCircle} value={stats?.cancelled_appointments || stats?.cancelledAppointments || stats?.cancelled || 0} label="Cancelled" variant="error" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <Card title="User Breakdown">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8f6f3', borderRadius: '8px' }}>
                <span>Students</span>
                <strong>{stats?.total_students || stats?.totalStudents || stats?.students || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8f6f3', borderRadius: '8px' }}>
                <span>Instructors</span>
                <strong>{stats?.total_instructors || stats?.totalInstructors || stats?.instructors || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#f8f6f3', borderRadius: '8px' }}>
                <span>Administrators</span>
                <strong>{stats?.total_admins || stats?.totalAdmins || stats?.admins || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#e8f5e9', borderRadius: '8px' }}>
                <span>Active Users</span>
                <strong style={{ color: '#2e7d32' }}>{stats?.active_users || stats?.activeUsers || 0}</strong>
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
        <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1e3a5f', marginBottom: '0.5rem' }}>
          Welcome back, {user?.first_name}!
        </h1>
        <p style={{ color: '#666' }}>Manage your office hours appointments</p>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={Calendar} value={upcomingAppointments.length} label="Upcoming Appointments" variant="primary" />
        <StatCard icon={Clock} value={todayAppointments.length} label="Today's Appointments" variant="accent" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card title="Upcoming Appointments" action={<Link to="/my-appointments" className="btn btn-ghost btn-sm">View All <ArrowRight size={16} /></Link>}>
          {upcomingAppointments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
              <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>No upcoming appointments</p>
              {isStudent && <Link to="/book" className="btn btn-primary" style={{ marginTop: '1rem' }}>Book an Appointment</Link>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingAppointments.slice(0, 5).map(apt => (
                <div key={apt.id} style={{ padding: '0.75rem', background: '#f8f6f3', borderRadius: '8px' }}>
                  <div style={{ fontWeight: '600', color: '#1e3a5f' }}>
                    {apt.is_instructor ? `${apt.student?.first_name} ${apt.student?.last_name}` : `${apt.instructor?.first_name} ${apt.instructor?.last_name}`}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>
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
