const ical = require('ical-generator').default;

const APP_NAME = 'Office Hours';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function generateAppointmentICS(appointment, student, instructor, isForStudent = true) {
  const calendar = ical({
    name: APP_NAME,
    timezone: 'America/New_York'
  });

  const [year, month, day] = appointment.date.split('-').map(Number);
  const [startHour, startMin] = appointment.start_time.split(':').map(Number);
  const [endHour, endMin] = appointment.end_time.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, startHour, startMin);
  const endDate = new Date(year, month - 1, day, endHour, endMin);

  const summary = isForStudent
    ? `Office Hours with ${instructor.first_name} ${instructor.last_name}`
    : `Office Hours: ${student.first_name} ${student.last_name}`;

  let description = `Office Hours Appointment\n\n`;
  description += isForStudent 
    ? `Instructor: ${instructor.first_name} ${instructor.last_name}\nEmail: ${instructor.email}\n`
    : `Student: ${student.first_name} ${student.last_name}\nEmail: ${student.email}\n`;
  
  if (appointment.topic) description += `\nTopic: ${appointment.topic}`;
  if (appointment.notes) description += `\nNotes: ${appointment.notes}`;
  description += `\n\nManage: ${APP_URL}/my-appointments`;

  const event = calendar.createEvent({
    start: startDate,
    end: endDate,
    summary: summary,
    description: description,
    location: appointment.meeting_type === 'virtual' 
      ? (appointment.meeting_link || 'Virtual Meeting') 
      : (appointment.location || 'TBD'),
    url: APP_URL + '/my-appointments'
  });

  event.createAlarm({ type: 'display', trigger: 3600 });
  event.createAlarm({ type: 'display', trigger: 86400 });

  return calendar.toString();
}

function getAppointmentICSHandler(db) {
  return (req, res) => {
    try {
      const { id } = req.params;

      const appointment = db.prepare(`
        SELECT a.*,
          s.first_name as student_first_name, s.last_name as student_last_name, s.email as student_email,
          i.first_name as instructor_first_name, i.last_name as instructor_last_name, i.email as instructor_email
        FROM appointments a
        JOIN users s ON a.student_id = s.id
        JOIN users i ON a.instructor_id = i.id
        WHERE a.id = ?
      `).get(id);

      if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

      if (appointment.student_id !== req.user.id && 
          appointment.instructor_id !== req.user.id && 
          req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const student = {
        first_name: appointment.student_first_name,
        last_name: appointment.student_last_name,
        email: appointment.student_email
      };

      const instructor = {
        first_name: appointment.instructor_first_name,
        last_name: appointment.instructor_last_name,
        email: appointment.instructor_email
      };

      const isForStudent = req.user.id === appointment.student_id;
      const icsContent = generateAppointmentICS(appointment, student, instructor, isForStudent);

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="appointment-${id}.ics"`);
      res.send(icsContent);
    } catch (error) {
      console.error('Generate ICS error:', error);
      res.status(500).json({ error: 'Failed to generate calendar file' });
    }
  };
}

module.exports = { generateAppointmentICS, getAppointmentICSHandler };
