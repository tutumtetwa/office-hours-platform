const { body, param, query, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// User registration validation
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number')
    .matches(/[a-zA-Z]/)
    .withMessage('Password must contain a letter'),
  body('first_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required (max 50 characters)'),
  body('last_name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required (max 50 characters)'),
  body('role')
    .optional()
    .isIn(['student', 'instructor', 'admin'])
    .withMessage('Role must be student, instructor, or admin'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department max 100 characters'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Availability slot validation
const validateSlot = [
  body('date')
    .isISO8601()
    .toDate()
    .withMessage('Valid date is required (YYYY-MM-DD)'),
  body('start_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid start time is required (HH:MM)'),
  body('end_time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Valid end time is required (HH:MM)')
    .custom((endTime, { req }) => {
      if (endTime <= req.body.start_time) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location max 200 characters'),
  body('meeting_type')
    .optional()
    .isIn(['in-person', 'virtual', 'either'])
    .withMessage('Meeting type must be in-person, virtual, or either'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes max 500 characters'),
  handleValidationErrors
];

// Appointment booking validation
const validateBooking = [
  body('slot_id')
    .notEmpty()
    .withMessage('Slot ID is required'),
  body('meeting_type')
    .isIn(['in-person', 'virtual'])
    .withMessage('Meeting type must be in-person or virtual'),
  body('topic')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Topic max 200 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes max 500 characters'),
  handleValidationErrors
];

// Cancellation validation
const validateCancellation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason max 500 characters'),
  handleValidationErrors
];

// Date range query validation
const validateDateRange = [
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be valid ISO8601 format'),
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('End date must be valid ISO8601 format'),
  handleValidationErrors
];

// UUID parameter validation
const validateUUID = (paramName) => [
  param(paramName)
    .notEmpty()
    .withMessage(`${paramName} is required`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateSlot,
  validateBooking,
  validateCancellation,
  validateDateRange,
  validateUUID
};
