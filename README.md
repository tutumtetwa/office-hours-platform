# Office Hours Booking Platform

A full-stack web application for scheduling academic office hours appointments between students and instructors.

🌐 **Live at [officehourscs370.online](https://officehourscs370.online)** — no installation required.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Deployed](https://img.shields.io/badge/deployed-Railway-blueviolet)

---

## Try It Now

**[https://officehourscs370.online](https://officehourscs370.online)**

Use the demo accounts below to explore all roles:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@university.edu | admin123 |
| **Instructor** | prof.smith@university.edu | instructor123 |
| **Instructor** | prof.johnson@university.edu | instructor123 |
| **Student** | student@university.edu | student123 |

Or register your own account.

---

## Features

### For Students
- Browse available office hours by instructor and date
- Book appointments with real-time availability
- Join a **waitlist** for fully-booked slots — get notified when a spot opens
- View and cancel upcoming appointments
- View full appointment history
- Download appointments as **.ics calendar files**

### For Instructors
- Create and manage individual availability slots
- Set up **recurring weekly office hours** (auto-generates slots)
- Configure slot duration and buffer time between appointments
- View scheduled appointments, mark as completed or no-show
- Cancel appointments with a reason
- Download full schedule as **.ics**

### For Administrators
- Provision users with auto-generated temp passwords (welcome email sent)
- Manage all users: edit, activate/deactivate, permanently delete
- View system-wide statistics
- Access full audit logs

### Communication
- Email confirmations for bookings and cancellations
- 24-hour and 1-hour reminder emails
- Waitlist availability notifications
- In-app notification center with unread badge

### Other
- Dark mode
- Email verification on self-registration
- Forced password reset on first login for admin-provisioned accounts
- JWT authentication with role-based access control
- Comprehensive audit logging

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios, date-fns, Lucide React |
| Backend | Node.js 18+, Express.js 4 |
| Database | PostgreSQL 15 |
| Auth | JWT, bcryptjs |
| Email | Resend |
| Hosting | Railway (backend + DB), Railway (frontend) |

---

## Project Structure

```
office-hours-platform/
├── backend/
│   ├── models/database.js        # PostgreSQL setup & migrations
│   ├── routes/
│   │   ├── auth.js               # Auth, email verification, password reset
│   │   ├── slots.js              # Availability slot management
│   │   ├── appointments.js       # Booking, cancel, complete
│   │   ├── recurring.js          # Recurring patterns & slot generation
│   │   ├── waitlist.js           # Waitlist management
│   │   ├── admin.js              # Admin user management
│   │   └── notifications.js      # In-app notifications
│   ├── middleware/auth.js         # JWT middleware
│   └── server.js
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Layout.js          # Sidebar + notifications
        │   └── UI.js              # Shared UI components
        ├── context/
        │   ├── AuthContext.js
        │   └── ThemeContext.js
        ├── pages/
        │   ├── LoginPage.js
        │   ├── RegisterPage.js
        │   ├── VerifyEmailPage.js
        │   ├── SetupPasswordPage.js
        │   ├── Dashboard.js
        │   ├── BookAppointment.js
        │   ├── MyAppointments.js
        │   ├── AvailabilityManagement.js
        │   ├── RecurringAvailability.js
        │   ├── Waitlist.js
        │   ├── History.js
        │   ├── Settings.js
        │   ├── AdminUsers.js
        │   └── AdminLogs.js
        └── utils/
            ├── api.js
            └── dateUtils.js
```

---

## Local Development

Only needed if you want to run a local copy for development.

### Prerequisites
- Node.js 18+
- PostgreSQL 15+

### Setup

```bash
# Clone the repo
git clone https://github.com/tutumtetwa/office-hours-platform.git
cd office-hours-platform

# Backend
cd backend
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, RESEND_API_KEY
npm start

# Frontend (new terminal)
cd frontend
npm install
npm start
```

### Environment Variables

**Backend `.env`**
```env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/officehours
JWT_SECRET=your-secret-key
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@yourdomain.com
APP_URL=http://localhost:3000
```

**Frontend `.env`**
```env
REACT_APP_API_URL=http://localhost:3001/api
```

---

## Built by

[Tutu](https://tutumtetwa.com) & Dennis

