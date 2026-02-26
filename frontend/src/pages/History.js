import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../hooks/useData';
import { Calendar, Clock, MapPin, Video, User } from 'lucide-react';
import { PageHeader, Card, Spinner, StatusBadge, EmptyState } from '../components/UI';
import { formatDate, formatTimeRange } from '../utils/dateUtils';

const History = () => {
  const { isInstructor } = useAuth();
  
  // Get all appointments that are not scheduled (completed, cancelled, no-show)
  const { appointments, loading } = useAppointments({});

  // Filter to past appointments
  const pastAppointments = appointments.filter(apt => {
    const now = new Date();
    const aptDate = new Date(`${apt.date}T${apt.end_time}`);
    return aptDate < now || apt.status !== 'scheduled';
  });

  // Group by month
  const groupedByMonth = pastAppointments.reduce((acc, apt) => {
    const monthKey = formatDate(apt.date, 'MMMM yyyy');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(apt);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => {
    return new Date(b) - new Date(a);
  });

  return (
    <>
      <PageHeader 
        title="Appointment History"
        subtitle="View your past appointments"
      />
      
      <div className="page-content">
        <Card>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <Spinner />
            </div>
          ) : pastAppointments.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No appointment history"
              description="Your completed and cancelled appointments will appear here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
              {sortedMonths.map(month => (
                <div key={month}>
                  <h3 style={{ 
                    marginBottom: 'var(--space-md)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {month}
                  </h3>

                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date & Time</th>
                          <th>{isInstructor ? 'Student' : 'Instructor'}</th>
                          <th>Topic</th>
                          <th>Type</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedByMonth[month].map(apt => (
                          <tr key={apt.id}>
                            <td>
                              <div style={{ fontWeight: 500 }}>
                                {formatDate(apt.date, 'MMM d, yyyy')}
                              </div>
                              <div className="text-sm text-secondary">
                                {formatTimeRange(apt.start_time, apt.end_time)}
                              </div>
                            </td>
                            <td>
                              {isInstructor ? (
                                <div>
                                  <div>{apt.student.first_name} {apt.student.last_name}</div>
                                  <div className="text-sm text-secondary">{apt.student.email}</div>
                                </div>
                              ) : (
                                <div>
                                  <div>{apt.instructor.first_name} {apt.instructor.last_name}</div>
                                  <div className="text-sm text-secondary">{apt.instructor.department}</div>
                                </div>
                              )}
                            </td>
                            <td>
                              {apt.topic || <span className="text-muted">—</span>}
                            </td>
                            <td>
                              {apt.meeting_type === 'virtual' ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Video size={14} /> Virtual
                                </span>
                              ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <MapPin size={14} /> In-person
                                </span>
                              )}
                            </td>
                            <td>
                              <StatusBadge status={apt.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
};

export default History;
