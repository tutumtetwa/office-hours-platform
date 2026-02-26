const nodemailer = require('nodemailer');
const { format } = require('date-fns');

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};

let transporter = null;
const APP_NAME = 'Office Hours';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Initialize email transporter
async function initializeEmailService() {
  if (!process.env.SMTP_USER) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      EMAIL_CONFIG.auth.user = testAccount.user;
      EMAIL_CONFIG.auth.pass = testAccount.pass;
      console.log('📧 Email Test Account Created:');
      console.log(`   User: ${testAccount.user}`);
      console.log(`   Preview URL: https://ethereal.email/messages`);
    } catch (err) {
      console.log('📧 Email service running in mock mode');
      return false;
    }
  }

  transporter = nodemailer.createTransport(EMAIL_CONFIG);
  
  try {
    await transporter.verify();
    console.log('📧 Email service connected successfully');
    return true;
  } catch (err) {
    console.log('📧 Email service unavailable:', err.message);
    return false;
  }
}

function formatTime(time) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatDateStr(date) {
  return format(new Date(date), 'EEEE, MMMM d, yyyy');
}

// Email templates
const templates = {
  bookingConfirmationStudent: (appointment, student, instructor) => ({
    subject: `✅ Appointment Confirmed - ${formatDateStr(appointment.date)}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0;">Appointment Confirmed! 🎉</h1>
        </div>
        <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
          <p>Hi ${student.first_name},</p>
          <p>Your office hours appointment has been confirmed.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #c9a227;">
            <h3 style="margin: 0 0 15px; color: #1e3a5f;">📅 Appointment Details</h3>
            <p><strong>Date:</strong> ${formatDateStr(appointment.date)}</p>
            <p><strong>Time:</strong> ${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}</p>
            <p><strong>Instructor:</strong> ${instructor.first_name} ${instructor.last_name}</p>
            <p><strong>Format:</strong> ${appointment.meeting_type === 'virtual' ? '💻 Virtual' : '🏢 In-Person'}</p>
            ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/my-appointments" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">View Appointments</a>
          </div>
        </div>
      </div>`
  }),

  bookingNotificationInstructor: (appointment, student, instructor) => ({
    subject: `📅 New Appointment - ${student.first_name} ${student.last_name}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a8a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0;">New Appointment Booked</h1>
        </div>
        <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
          <p>Hi ${instructor.first_name},</p>
          <p>A student has booked an appointment with you.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #c9a227;">
            <p><strong>Student:</strong> ${student.first_name} ${student.last_name}</p>
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>Date:</strong> ${formatDateStr(appointment.date)}</p>
            <p><strong>Time:</strong> ${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}</p>
            ${appointment.topic ? `<p><strong>Topic:</strong> ${appointment.topic}</p>` : ''}
          </div>
        </div>
      </div>`
  }),

  cancellationNotification: (appointment, recipient, cancelledBy, reason) => ({
    subject: `❌ Appointment Cancelled - ${formatDateStr(appointment.date)}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #c23a3a, #e85555); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0;">Appointment Cancelled</h1>
        </div>
        <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
          <p>Hi ${recipient.first_name},</p>
          <p>The following appointment has been cancelled by ${cancelledBy}.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #c23a3a;">
            <p><strong>Date:</strong> ${formatDateStr(appointment.date)}</p>
            <p><strong>Time:</strong> ${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/book" style="background: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Book New Appointment</a>
          </div>
        </div>
      </div>`
  }),

  reminder24h: (appointment, recipient, otherParty, isStudent) => ({
    subject: `⏰ Reminder: Appointment Tomorrow - ${formatTime(appointment.start_time)}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #c9a227, #e8c84a); color: #1e3a5f; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0;">⏰ Appointment Tomorrow!</h1>
        </div>
        <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
          <p>Hi ${recipient.first_name},</p>
          <p>Reminder: You have an appointment tomorrow.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #c9a227;">
            <p><strong>Date:</strong> ${formatDateStr(appointment.date)}</p>
            <p><strong>Time:</strong> ${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}</p>
            <p><strong>${isStudent ? 'Instructor' : 'Student'}:</strong> ${otherParty.first_name} ${otherParty.last_name}</p>
            <p><strong>Format:</strong> ${appointment.meeting_type === 'virtual' ? '💻 Virtual' : '🏢 In-Person'}</p>
            ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
          </div>
        </div>
      </div>`
  }),

  reminder1h: (appointment, recipient, otherParty, isStudent) => ({
    subject: `🔔 Starting Soon: Appointment in 1 Hour`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2d7a4f, #3d9d6a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0;">🔔 Starting in 1 Hour!</h1>
        </div>
        <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
          <p>Hi ${recipient.first_name},</p>
          <p>Your appointment begins in <strong>1 hour</strong>.</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2d7a4f;">
            <p><strong>Time:</strong> ${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}</p>
            <p><strong>${isStudent ? 'Instructor' : 'Student'}:</strong> ${otherParty.first_name} ${otherParty.last_name}</p>
            ${appointment.meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${appointment.meeting_link}">Join Meeting</a></p>` : ''}
            ${appointment.location ? `<p><strong>Location:</strong> ${appointment.location}</p>` : ''}
          </div>
        </div>
      </div>`
  }),

  waitlistSpotAvailable: (slot, student, instructor) => ({
    subject: `🎉 Spot Available! ${formatDateStr(slot.date)}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2d7a4f, #3d9d6a); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0;">🎉 A Spot Opened Up!</h1>
        </div>
        <div style="background: #f8f6f3; padding: 30px; border-radius: 0 0 12px 12px;">
          <p>Hi ${student.first_name},</p>
          <p>A slot you were waiting for is now available!</p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #2d7a4f;">
            <p><strong>Date:</strong> ${formatDateStr(slot.date)}</p>
            <p><strong>Time:</strong> ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}</p>
            <p><strong>Instructor:</strong> ${instructor.first_name} ${instructor.last_name}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}/book" style="background: #2d7a4f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Book Now</a>
          </div>
          <p style="color: #888; font-size: 14px;">⚡ First-come, first-served!</p>
        </div>
      </div>`
  })
};

async function sendEmail(to, template, data) {
  if (!transporter) {
    console.log(`📧 [Mock] Would send "${template}" to ${to}`);
    return { success: true, mock: true };
  }

  try {
    const emailContent = templates[template](...data);
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <noreply@officehours.edu>`,
      to: to,
      subject: emailContent.subject,
      html: emailContent.html
    });

    console.log(`📧 Email sent: ${template} to ${to}`);
    if (EMAIL_CONFIG.host === 'smtp.ethereal.email') {
      console.log(`   Preview: ${nodemailer.getTestMessageUrl(info)}`);
    }
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`📧 Failed to send email: ${err.message}`);
    return { success: false, error: err.message };
  }
}

const emailService = {
  initialize: initializeEmailService,
  
  sendBookingConfirmation: async (appointment, student, instructor) => {
    await sendEmail(student.email, 'bookingConfirmationStudent', [appointment, student, instructor]);
    await sendEmail(instructor.email, 'bookingNotificationInstructor', [appointment, student, instructor]);
  },

  sendCancellationNotification: async (appointment, student, instructor, cancelledByRole, reason) => {
    const cancelledBy = cancelledByRole === 'student' 
      ? `${student.first_name} ${student.last_name}` 
      : `${instructor.first_name} ${instructor.last_name}`;
    
    if (cancelledByRole === 'student') {
      await sendEmail(instructor.email, 'cancellationNotification', [appointment, instructor, cancelledBy, reason]);
    } else {
      await sendEmail(student.email, 'cancellationNotification', [appointment, student, cancelledBy, reason]);
    }
  },

  sendReminder24h: async (appointment, student, instructor) => {
    await sendEmail(student.email, 'reminder24h', [appointment, student, instructor, true]);
    await sendEmail(instructor.email, 'reminder24h', [appointment, instructor, student, false]);
  },

  sendReminder1h: async (appointment, student, instructor) => {
    await sendEmail(student.email, 'reminder1h', [appointment, student, instructor, true]);
    await sendEmail(instructor.email, 'reminder1h', [appointment, instructor, student, false]);
  },

  sendWaitlistNotification: async (slot, student, instructor) => {
    await sendEmail(student.email, 'waitlistSpotAvailable', [slot, student, instructor]);
  }
};

module.exports = emailService;
