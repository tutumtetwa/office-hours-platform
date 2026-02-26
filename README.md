# Office Hours Booking Platform

A full-stack web application for scheduling academic office hours appointments between students and instructors.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![SQLite](https://img.shields.io/badge/SQLite-3-lightgrey)

## Features

### For Students
- Browse available office hours by instructor and date
- Book appointments with instructors
- **Join waitlist** for fully-booked slots (get notified when spot opens!)
- View and manage upcoming appointments
- Cancel appointments when needed
- View appointment history
- **Download calendar (.ics)** for any appointment

### For Instructors
- Create and manage individual availability slots
- **Set up recurring weekly office hours** (auto-generates slots!)
- **Configure buffer time** between appointments
- View scheduled appointments
- Mark appointments as completed or no-show
- Cancel appointments with reason
- **Download calendar (.ics)** of all appointments

### For Administrators
- Manage all users (create, edit, activate/deactivate)
- View system-wide statistics
- Access audit logs for all system activity

### Communication & Notifications
- **Email notifications** for booking confirmations
- **Email notifications** for cancellations
- **24-hour reminder emails** before appointments
- **1-hour reminder emails** before appointments
- **In-app notification center** with unread badge
- **Waitlist notifications** when spots open up

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on login attempts
- Session management with auto-expiry
- Role-based access control
- Comprehensive audit logging

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

To check if you have them installed:
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

---

## Quick Start Guide

### Step 1: Extract/Download the Project

If you downloaded a ZIP file:
```bash
unzip office-hours-platform.zip
cd office-hours-platform
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

This will install:
- Express.js (web framework)
- better-sqlite3 (database)
- bcryptjs (password hashing)
- jsonwebtoken (JWT auth)
- And other dependencies...

### Step 3: Start the Backend Server

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║     Office Hours Booking Platform - API Server        ║
╠═══════════════════════════════════════════════════════╣
║  Server running on http://localhost:3001              ║
║  Environment: development                             ║
║  Database: SQLite (local)                             ║
╚═══════════════════════════════════════════════════════╝

Demo Credentials:
  Admin:      admin@university.edu / admin123
  Instructor: prof.smith@university.edu / instructor123
  Student:    student@university.edu / student123
```

**Keep this terminal open!** The backend needs to keep running.

### Step 4: Install Frontend Dependencies (New Terminal)

Open a **new terminal window** and navigate to the frontend:

```bash
cd office-hours-platform/frontend
npm install
```

This will install:
- React 18
- React Router
- Axios (HTTP client)
- date-fns (date utilities)
- lucide-react (icons)

### Step 5: Start the Frontend Development Server

```bash
npm start
```

This will:
1. Start the React development server
2. Automatically open your browser to `http://localhost:3000`

---

## Demo Credentials

The system comes pre-loaded with demo accounts:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@university.edu | admin123 |
| **Instructor** | prof.smith@university.edu | instructor123 |
| **Instructor** | prof.johnson@university.edu | instructor123 |
| **Student** | student@university.edu | student123 |

---

## Project Structure

```
office-hours-platform/
├── backend/                    # Express.js API server
│   ├── models/
│   │   └── database.js         # SQLite database setup
│   ├── routes/
│   │   ├── auth.js             # Authentication endpoints
│   │   ├── slots.js            # Availability management
│   │   ├── appointments.js     # Booking endpoints
│   │   └── admin.js            # Admin endpoints
│   ├── middleware/
│   │   └── auth.js             # JWT authentication
│   ├── utils/
│   │   ├── logger.js           # Audit logging
│   │   └── validators.js       # Input validation
│   ├── server.js               # Main server file
│   ├── package.json
│   └── database.sqlite         # SQLite database (auto-created)
│
├── frontend/                   # React application
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js       # Main layout with sidebar
│   │   │   └── UI.js           # Reusable UI components
│   │   ├── context/
│   │   │   └── AuthContext.js  # Authentication state
│   │   ├── hooks/
│   │   │   └── useData.js      # Data fetching hooks
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── Dashboard.js
│   │   │   ├── BookAppointment.js
│   │   │   ├── MyAppointments.js
│   │   │   ├── AvailabilityManagement.js
│   │   │   ├── History.js
│   │   │   ├── Settings.js
│   │   │   ├── AdminUsers.js
│   │   │   └── AdminLogs.js
│   │   ├── utils/
│   │   │   ├── api.js          # API client
│   │   │   └── dateUtils.js    # Date formatting
│   │   ├── styles/
│   │   │   └── index.css       # All styles
│   │   ├── App.js              # Main app with routing
│   │   └── index.js            # Entry point
│   └── package.json
│
└── README.md
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/password` | Change password |

### Availability Slots
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/slots` | Get available slots |
| GET | `/api/slots/instructors` | List all instructors |
| GET | `/api/slots/my-slots` | Get instructor's own slots |
| POST | `/api/slots` | Create availability slot |
| POST | `/api/slots/bulk` | Create multiple slots |
| PUT | `/api/slots/:id` | Update slot |
| DELETE | `/api/slots/:id` | Delete slot |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appointments/my-appointments` | Get user's appointments |
| GET | `/api/appointments/:id` | Get appointment details |
| POST | `/api/appointments/book` | Book an appointment |
| POST | `/api/appointments/:id/cancel` | Cancel appointment |
| PUT | `/api/appointments/:id` | Update appointment |
| POST | `/api/appointments/:id/complete` | Mark as complete/no-show |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | Get user details |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user |
| POST | `/api/admin/users/:id/deactivate` | Deactivate user |
| POST | `/api/admin/users/:id/reactivate` | Reactivate user |
| GET | `/api/admin/audit-logs` | Get audit logs |
| GET | `/api/admin/stats` | Get system statistics |

---

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=3001
JWT_SECRET=your-super-secret-key-change-in-production
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:3001/api
```

---

## Troubleshooting

### "Cannot find module" errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Port already in use
```bash
# Find and kill process on port 3001
lsof -i :3001
kill -9 <PID>

# Or use a different port
PORT=3002 npm start
```

### Database issues
```bash
# Delete and recreate database
rm backend/database.sqlite
npm start  # Will recreate with demo data
```

### CORS errors
Make sure the backend is running on port 3001 and frontend on port 3000, or update the CORS configuration in `backend/server.js`.

---

## Building for Production

### Frontend Build
```bash
cd frontend
npm run build
```

This creates an optimized build in `frontend/build/`.

### Serving in Production

1. Build the frontend
2. Serve the `build/` folder with a static file server
3. Run the backend with `NODE_ENV=production`

Example with Express serving static files:
```javascript
// Add to server.js for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, helmet, express-rate-limit
- **Validation**: express-validator

### Frontend
- **Framework**: React 18
- **Routing**: React Router 6
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Styling**: Custom CSS (no framework)

---

## License

MIT License - feel free to use this for educational purposes.
