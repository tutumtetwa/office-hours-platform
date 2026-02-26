import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (currentPassword, newPassword) => api.put('/auth/password', { current_password: currentPassword, new_password: newPassword })
};

export const slotsAPI = {
  getInstructors: () => api.get('/slots/instructors'),
  getSlots: (params) => api.get('/slots', { params }),
  getMySlots: (params) => api.get('/slots/my-slots', { params }),
  createSlot: (data) => api.post('/slots', data),
  createBulkSlots: (slots) => api.post('/slots/bulk', { slots }),
  updateSlot: (id, data) => api.put(`/slots/${id}`, data),
  deleteSlot: (id) => api.delete(`/slots/${id}`)
};

export const appointmentsAPI = {
  getMyAppointments: (params) => api.get('/appointments/my-appointments', { params }),
  getAppointment: (id) => api.get(`/appointments/${id}`),
  bookAppointment: (data) => api.post('/appointments/book', data),
  cancelAppointment: (id, reason) => api.post(`/appointments/${id}/cancel`, { reason }),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  completeAppointment: (id, status) => api.post(`/appointments/${id}/complete`, { status })
};

export const recurringAPI = {
  getPatterns: () => api.get('/recurring'),
  createPattern: (data) => api.post('/recurring', data),
  updatePattern: (id, data) => api.put(`/recurring/${id}`, data),
  deletePattern: (id, deleteFutureSlots = false) => api.delete(`/recurring/${id}?delete_future_slots=${deleteFutureSlots}`),
  generateSlots: (id, data) => api.post(`/recurring/${id}/generate`, data)
};

export const waitlistAPI = {
  getMyWaitlist: () => api.get('/waitlist/my-waitlist'),
  getSlotWaitlist: (slotId) => api.get(`/waitlist/slot/${slotId}`),
  joinWaitlist: (slotId) => api.post('/waitlist/join', { slot_id: slotId }),
  leaveWaitlist: (slotId) => api.delete(`/waitlist/leave/${slotId}`)
};

export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications')
};

export const calendarAPI = {
  downloadAppointmentICS: (id) => `${API_URL}/calendar/appointment/${id}/ics`,
  downloadAllICS: () => `${API_URL}/calendar/my-appointments/ics`
};

export const adminAPI = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deactivateUser: (id) => api.post(`/admin/users/${id}/deactivate`),
  reactivateUser: (id) => api.post(`/admin/users/${id}/reactivate`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getStats: () => api.get('/admin/stats'),
  getDepartments: () => api.get('/admin/departments')
};

export default api;
