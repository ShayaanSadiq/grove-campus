export const CATEGORIES = ['Academics', 'Sports', 'Health', 'Facilities', 'Transport', 'Career'];

export const DEPARTMENTS = [
  'Computer Science',
  'Electronics',
  'Mechanical',
  'Civil',
  'Management',
  'Sciences',
  'Humanities',
  'Administration',
];

export const SLOTS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

export const BOOKING_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

export const PAYMENT_METHODS = ['card', 'campus_wallet'];

export const API_CATALOG = [
  { method: 'GET', path: '/api/health', access: 'Public', purpose: 'Check that the API is running' },
  { method: 'GET', path: '/api', access: 'Public', purpose: 'Read this API map' },
  { method: 'GET', path: '/api/meta', access: 'Public', purpose: 'Categories, departments, slots, and campus totals' },
  { method: 'POST', path: '/api/auth/register', access: 'Public', purpose: 'Create a student account' },
  { method: 'POST', path: '/api/auth/login', access: 'Public', purpose: 'Sign in and receive a JWT' },
  { method: 'GET', path: '/api/auth/me', access: 'Signed in', purpose: 'Read the current user' },
  { method: 'PATCH', path: '/api/users/me', access: 'Signed in', purpose: 'Update profile details' },
  { method: 'PATCH', path: '/api/users/me/password', access: 'Signed in', purpose: 'Change password' },
  { method: 'GET', path: '/api/services', access: 'Public', purpose: 'Search, filter, and sort services' },
  { method: 'GET', path: '/api/services/:id', access: 'Public', purpose: 'Service detail and reviews' },
  { method: 'GET', path: '/api/services/:id/availability', access: 'Public', purpose: 'Remaining seats for a date' },
  { method: 'POST', path: '/api/services', access: 'Admin', purpose: 'Create a service' },
  { method: 'PUT', path: '/api/services/:id', access: 'Admin', purpose: 'Update a service' },
  { method: 'DELETE', path: '/api/services/:id', access: 'Admin', purpose: 'Delete or retire a service' },
  { method: 'GET', path: '/api/bookings', access: 'Signed in', purpose: 'List own bookings, or all bookings for admins' },
  { method: 'GET', path: '/api/bookings/:id', access: 'Owner or admin', purpose: 'Booking detail, payment, and feedback' },
  { method: 'POST', path: '/api/bookings', access: 'Student', purpose: 'Reserve a slot' },
  { method: 'POST', path: '/api/bookings/:id/cancel', access: 'Owner or admin', purpose: 'Cancel a booking and refund a payment' },
  { method: 'PATCH', path: '/api/bookings/:id/status', access: 'Admin', purpose: 'Move a booking through its lifecycle' },
  { method: 'POST', path: '/api/payments', access: 'Student', purpose: 'Pay for a booking in the sandbox' },
  { method: 'POST', path: '/api/feedback', access: 'Student', purpose: 'Review a completed booking' },
  { method: 'GET', path: '/api/feedback', access: 'Public or admin', purpose: 'Reviews for a service, or every review for admins' },
  { method: 'GET', path: '/api/admin/stats', access: 'Admin', purpose: 'Dashboard totals, revenue, and recent activity' },
  { method: 'GET', path: '/api/admin/users', access: 'Admin', purpose: 'Search campus accounts' },
  { method: 'PATCH', path: '/api/admin/users/:id', access: 'Admin', purpose: 'Change a role or suspend an account' },
];
