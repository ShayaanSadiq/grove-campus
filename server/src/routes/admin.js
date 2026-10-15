import { Router } from 'express';
import { getDb, save } from '../db.js';
import { CATEGORIES, BOOKING_STATUSES } from '../lib/constants.js';
import { campusMonthKey, campusToday } from '../lib/dates.js';
import { presentBooking, presentReview } from '../lib/present.js';
import { badRequest, cleanText, rules, toPublicUser } from '../lib/validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

router.get('/stats', (req, res) => {
  const db = getDb();
  const ratings = db.feedback.map((item) => item.rating);
  const byStatus = Object.fromEntries(BOOKING_STATUSES.map((status) => [
    status,
    db.bookings.filter((booking) => booking.status === status).length,
  ]));
  const byCategory = CATEGORIES.map((category) => ({
    category,
    bookings: db.bookings.filter((booking) => {
      const service = db.services.find((item) => item.id === booking.serviceId);
      return service?.category === category && booking.status !== 'cancelled';
    }).length,
  }));

  const [year, month] = campusToday().split('-').map(Number);
  const revenueByMonth = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const stamp = new Date(Date.UTC(year, month - 1 - offset, 1));
    const key = stamp.toISOString().slice(0, 7);
    const label = new Date(`${key}-01T00:00:00+05:30`).toLocaleString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' });
    const amount = db.payments
      .filter((payment) => payment.status === 'paid' && campusMonthKey(payment.createdAt) === key)
      .reduce((sum, payment) => sum + payment.amount, 0);
    revenueByMonth.push({ month: key, label, amount });
  }

  const topServices = db.services
    .map((service) => {
      const related = db.bookings.filter((booking) => booking.serviceId === service.id && booking.status !== 'cancelled');
      const revenue = db.payments
        .filter((payment) => payment.status === 'paid' && related.some((booking) => booking.id === payment.bookingId))
        .reduce((sum, payment) => sum + payment.amount, 0);
      return { id: service.id, name: service.name, category: service.category, bookings: related.length, revenue };
    })
    .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue)
    .slice(0, 5);

  return res.json({
    totals: {
      students: db.users.filter((user) => user.role === 'student').length,
      suspended: db.users.filter((user) => user.status === 'suspended').length,
      services: db.services.filter((service) => service.status === 'active').length,
      bookings: db.bookings.length,
      revenue: db.payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0),
      averageRating: ratings.length ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10 : null,
      reviews: ratings.length,
    },
    byStatus,
    byCategory,
    revenueByMonth,
    topServices,
    recentBookings: [...db.bookings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6)
      .map((booking) => presentBooking(db, booking)),
    recentFeedback: [...db.feedback]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 4)
      .map((item) => presentReview(db, item)),
  });
});

router.get('/users', (req, res) => {
  const query = cleanText(req.query.q, 80).toLowerCase();
  const users = getDb().users
    .filter((user) => {
      if (!query) return true;
      return `${user.name} ${user.email} ${user.studentId} ${user.department}`.toLowerCase().includes(query);
    })
    .map((user) => toPublicUser(user))
    .sort((a, b) => a.name.localeCompare(b.name));
  return res.json({ users });
});

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const parsedRole = rules.oneOf(['student', 'admin'], 'role')(req.body?.role);
  const parsedStatus = rules.oneOf(['active', 'suspended'], 'status')(req.body?.status);
  const fields = {};
  if (parsedRole.error) fields.role = parsedRole.error;
  if (parsedStatus.error) fields.status = parsedStatus.error;
  if (Object.keys(fields).length) return badRequest(res, fields);
  if (req.params.id === req.user.id) {
    return res.status(409).json({ error: 'You cannot change your own access.' });
  }

  const db = getDb();
  const user = db.users.find((item) => item.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.role = parsedRole.value;
  user.status = parsedStatus.value;
  await save();
  return res.json({ user: toPublicUser(user) });
}));

export default router;
