import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import BookAppointment from './pages/BookAppointment';
import MyAppointments from './pages/MyAppointments';
import AvailabilityManagement from './pages/AvailabilityManagement';
import RecurringAvailability from './pages/RecurringAvailability';
import Waitlist from './pages/Waitlist';
import History from './pages/History';
import Settings from './pages/Settings';
import AdminUsers from './pages/AdminUsers';
import AdminLogs from './pages/AdminLogs';

// Components
import Layout from './components/Layout';
import { Spinner } from './components/UI';

// Styles
import './styles/index.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute><LoginPage /></PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute><RegisterPage /></PublicRoute>
      } />

      {/* Protected Routes - All Users */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/my-appointments" element={
        <ProtectedRoute><MyAppointments /></ProtectedRoute>
      } />
      <Route path="/history" element={
        <ProtectedRoute><History /></ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute><Settings /></ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/book" element={
        <ProtectedRoute allowedRoles={['student', 'admin']}>
          <BookAppointment />
        </ProtectedRoute>
      } />

      {/* Instructor Routes */}
      <Route path="/availability" element={
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
          <AvailabilityManagement />
        </ProtectedRoute>
      } />
      <Route path="/recurring" element={
        <ProtectedRoute allowedRoles={['instructor', 'admin']}>
          <RecurringAvailability />
        </ProtectedRoute>
      } />

      {/* Student Routes */}
      <Route path="/waitlist" element={
        <ProtectedRoute allowedRoles={['student', 'admin']}>
          <Waitlist />
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminUsers />
        </ProtectedRoute>
      } />
      <Route path="/admin/logs" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminLogs />
        </ProtectedRoute>
      } />

      {/* Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
