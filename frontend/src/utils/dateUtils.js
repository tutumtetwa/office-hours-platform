import { format, parseISO, isToday, isTomorrow, isYesterday, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isPast, isFuture } from 'date-fns';

// Format date for display
export const formatDate = (date, formatStr = 'MMM d, yyyy') => {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
};

// Format time for display
export const formatTime = (time) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Format time range
export const formatTimeRange = (startTime, endTime) => {
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
};

// Get relative date label
export const getRelativeDateLabel = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) return 'Today';
  if (isTomorrow(dateObj)) return 'Tomorrow';
  if (isYesterday(dateObj)) return 'Yesterday';
  
  return format(dateObj, 'EEEE, MMM d');
};

// Get days of current week
export const getWeekDays = (startDate = new Date()) => {
  const start = startOfWeek(startDate, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(startDate, { weekStartsOn: 1 });
  
  return eachDayOfInterval({ start, end });
};

// Get next N days
export const getNextDays = (count = 7, startDate = new Date()) => {
  return Array.from({ length: count }, (_, i) => addDays(startDate, i));
};

// Check if date is in the past
export const isDatePast = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isPast(dateObj) && !isToday(dateObj);
};

// Check if date is in the future
export const isDateFuture = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isFuture(dateObj) || isToday(dateObj);
};

// Check if two dates are the same day
export const isSameDayAs = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  return isSameDay(d1, d2);
};

// Format date for API (YYYY-MM-DD)
export const formatDateForAPI = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};

// Get duration in minutes between two times
export const getDurationMinutes = (startTime, endTime) => {
  const [startHours, startMins] = startTime.split(':').map(Number);
  const [endHours, endMins] = endTime.split(':').map(Number);
  
  const startTotal = startHours * 60 + startMins;
  const endTotal = endHours * 60 + endMins;
  
  return endTotal - startTotal;
};

// Format duration
export const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};
