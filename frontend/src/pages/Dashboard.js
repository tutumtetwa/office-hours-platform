import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppointments, useAdminStats } from '../hooks/useData';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users,
  CalendarPlus,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { PageHeader, StatCard, Card, StatusBadge, EmptyState, Spinner } from '../components/UI';
import { formatDate, formatTimeRange, getRelativeDateLabel } from '../utils/dateUtils';

const Dashboard = () => {
  const { user, isStudent, isInstructor, isAdmin } = useAuth();

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return isInstructor ? <InstructorDashboard /> : <StudentDashboard />;
};

// Student Dashboard
const StudentDashboard = () => {
  const { user } = useAuth();
  const { appointments, loading } = useAppointments({ upcoming_only: 'true' });

  const upcomingCount = appointments.length;
  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.date === today;
  });

  return (
    <>
      <PageHeader 
        title={`Welcome back, ${user?.first_name}!`}
        subtitle="Manage your office hours appointments"
      />
      
      <div className="page-content">
        <div className="stats-grid">
          <StatCard 
            icon={Calendar} 
            value={upcomingCount} 
            label="Upcoming Appointments" 
            variant="primary"
          />
          <StatCard 
            icon={Clock} 
            value={todayAppointments.length} 
            label="Today's Appointments" 
            variant="accent"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
          <Card 
            title="Upcoming Appointments"
            action={
              <Link to="/my-appointments" className="btn btn-ghost btn-sm">
                View All <ArrowRight size={16} />
              </Link>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <Spinner />
              </div>
            ) : appointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming appointments"
                description="Book an appointment with an instructor to get started."
                action={
                  <Link to="/book" className="btn btn-primary">
                    <CalendarPlus size={18} />
                    Book Appointment
                  </Link>
                }
              />
            ) : (
              <div className="slots-grid">
                {appointments.slice(0, 3).map(apt => (
                  <div key={apt.id} className="slot-card">
                    <div>
                      <div className="slot-time">{formatTimeRange(apt.start_time, apt.end_time)}</div>
                      <div className="text-sm text-secondary">{getRelativeDateLabel(apt.date)}</div>
                    </div>
                    <div className="slot-info">
                      <div className="slot-instructor">
                        {apt.instructor.first_name} {apt.instructor.last_name}
                      </div>
                      <div className="slot-details">
                        <span>{apt.instructor.department}</span>
                        {apt.topic && <span>• {apt.topic}</span>}
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Link to="/book" className="btn btn-primary btn-lg" style={{ justifyContent: 'flex-start' }}>
                <CalendarPlus size={20} />
                Book New Appointment
              </Link>
              <Link to="/my-appointments" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Clock size={20} />
                View My Appointments
              </Link>
              <Link to="/history" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <CheckCircle size={20} />
                View Past Appointments
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

// Instructor Dashboard
const InstructorDashboard = () => {
  const { user } = useAuth();
  const { appointments, loading } = useAppointments({ upcoming_only: 'true' });

  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toISOString().split('T')[0];
    return apt.date === today;
  });

  return (
    <>
      <PageHeader 
        title={`Welcome back, ${user?.first_name}!`}
        subtitle="Manage your office hours and appointments"
      />
      
      <div className="page-content">
        <div className="stats-grid">
          <StatCard 
            icon={Calendar} 
            value={appointments.length} 
            label="Upcoming Appointments" 
            variant="primary"
          />
          <StatCard 
            icon={Clock} 
            value={todayAppointments.length} 
            label="Today's Appointments" 
            variant="accent"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
          <Card 
            title="Today's Schedule"
            action={
              <Link to="/my-appointments" className="btn btn-ghost btn-sm">
                View All <ArrowRight size={16} />
              </Link>
            }
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
                <Spinner />
              </div>
            ) : todayAppointments.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No appointments today"
                description="Your schedule is clear for today."
              />
            ) : (
              <div className="slots-grid">
                {todayAppointments.map(apt => (
                  <div key={apt.id} className="slot-card">
                    <div>
                      <div className="slot-time">{formatTimeRange(apt.start_time, apt.end_time)}</div>
                    </div>
                    <div className="slot-info">
                      <div className="slot-instructor">
                        {apt.student.first_name} {apt.student.last_name}
                      </div>
                      <div className="slot-details">
                        {apt.topic && <span>{apt.topic}</span>}
                        <span>{apt.meeting_type}</span>
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Link to="/availability" className="btn btn-primary btn-lg" style={{ justifyContent: 'flex-start' }}>
                <CalendarPlus size={20} />
                Manage Availability
              </Link>
              <Link to="/my-appointments" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Clock size={20} />
                View All Appointments
              </Link>
              <Link to="/history" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <CheckCircle size={20} />
                View Past Appointments
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { stats, loading } = useAdminStats();

  if (loading) {
    return (
      <>
        <PageHeader title="Admin Dashboard" subtitle="System overview and management" />
        <div className="page-content" style={{ textAlign: 'center', padding: 'var(--space-3xl)' }}>
          <Spinner size={32} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Admin Dashboard"
        subtitle="System overview and management"
      />
      
      <div className="page-content">
        <div className="stats-grid">
          <StatCard 
            icon={Users} 
            value={stats?.users?.total_users || 0} 
            label="Total Users" 
            variant="primary"
          />
          <StatCard 
            icon={Calendar} 
            value={stats?.appointments?.total_appointments || 0} 
            label="Total Appointments" 
            variant="accent"
          />
          <StatCard 
            icon={CheckCircle} 
            value={stats?.appointments?.completed || 0} 
            label="Completed" 
            variant="success"
          />
          <StatCard 
            icon={XCircle} 
            value={stats?.appointments?.cancelled || 0} 
            label="Cancelled" 
            variant="warning"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)' }}>
          <Card title="User Breakdown">
            <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <span>Students</span>
                <strong>{stats?.users?.students || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <span>Instructors</span>
                <strong>{stats?.users?.instructors || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                <span>Administrators</span>
                <strong>{stats?.users?.admins || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-md)', background: 'var(--color-success-bg)', borderRadius: 'var(--radius-md)' }}>
                <span>Active Users</span>
                <strong style={{ color: 'var(--color-success)' }}>{stats?.users?.active_users || 0}</strong>
              </div>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Link to="/admin/users" className="btn btn-primary btn-lg" style={{ justifyContent: 'flex-start' }}>
                <Users size={20} />
                Manage Users
              </Link>
              <Link to="/admin/logs" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <TrendingUp size={20} />
                View Audit Logs
              </Link>
            </div>
          </Card>
        </div>

        {stats?.recentActivity && stats.recentActivity.length > 0 && (
          <Card title="Recent Activity (Last 7 Days)" className="mt-xl">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((activity, idx) => (
                    <tr key={idx}>
                      <td>{activity.action.replace(/_/g, ' ')}</td>
                      <td><strong>{activity.count}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};

export default Dashboard;
