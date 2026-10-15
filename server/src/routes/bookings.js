import crypto from 'crypto';
import { Router } from 'express';
import { getDb, save } from '../db.js';
import { BOOKING_STATUSES, SLOTS } from '../lib/constants.js';
import { campusToday, isIsoDate } from '../lib/dates.js';
import { heldCount, presentBooking } from '../lib/present.js';
import { badRequest, cleanText, collect, rules } from '../lib/validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const status = cleanText(req.query.status, 20);
  const query = cleanText(req.query.q, 80).toLowerCase();
  if (status && !BOOKING_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Unknown booking status.' });
  }

  const bookings = db.bookings
    .filter((booking) => req.user.role === 'admin' || booking.userId === req.user.id)
    .filter((booking) => !status || booking.status === status)
    .map((booking) => presentBooking(db, booking))
    .filter((booking) => {
      if (!query) return true;
      const serviceName = booking.service?.name || '';
      const person = `${booking.user?.name || ''} ${booking.user?.email || ''}`;
      return `${serviceName} ${person} ${booking.notes}`.toLowerCase().includes(query);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.timeSlot.localeCompare(a.timeSlot));

  return res.json({ bookings });
});

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const booking = db.bookings.find((item) => item.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You do not have access to that booking.' });
  }
  return res.json({ booking: presentBooking(db, booking) });
});

router.post('/', requireAuth, requireRole('student'), asyncHandler(async (req, res) => {
  const parsed = collect(req.body, {
    serviceId: (raw) => {
      const value = cleanText(raw, 60);
      return value ? { value } : { error: 'Choose a service.' };
    },
    date: (raw) => {
      const value = cleanText(raw, 10);
      if (!isIsoDate(value)) return { error: 'Choose a valid date.' };
      if (value < campusToday()) return { error: 'Choose today or a future date.' };
      return { value };
    },
    timeSlot: rules.oneOf(SLOTS, 'time slot'),
    notes: rules.optionalText(400),
  });
  if (!parsed.ok) return badRequest(res, parsed.fields);

  const db = getDb();
  const service = db.services.find((item) => item.id === parsed.value.serviceId);
  if (!service || service.status !== 'active') {
    return res.status(404).json({ error: 'That service is not open for booking.' });
  }
  if (!service.slots.includes(parsed.value.timeSlot)) {
    return badRequest(res, { timeSlot: 'Choose one of the open slots.' });
  }
  if (heldCount(db, service.id, parsed.value.date, parsed.value.timeSlot) >= service.capacity) {
    return res.status(409).json({ error: 'That slot is full. Choose another time.' });
  }

  const free = service.price === 0;
  const timestamp = new Date().toISOString();
  const booking = {
    id: crypto.randomUUID(),
    userId: req.user.id,
    serviceId: service.id,
    date: parsed.value.date,
    timeSlot: parsed.value.timeSlot,
    notes: parsed.value.notes,
    status: free ? 'confirmed' : 'pending',
    paymentStatus: free ? 'not_required' : 'unpaid',
    amount: service.price,
    cancelReason: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  db.bookings.push(booking);
  await save();
  return res.status(201).json({ booking: presentBooking(db, booking) });
}));

router.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  const db = getDb();
  const booking = db.bookings.find((item) => item.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  const isOwner = booking.userId === req.user.id;
  if (!isOwner && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You do not have access to that booking.' });
  }
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    return res.status(409).json({ error: 'This booking can no longer be cancelled.' });
  }
  if (req.user.role !== 'admin' && booking.date < campusToday()) {
    return res.status(409).json({ error: 'Past bookings can only be closed by the campus office.' });
  }

  booking.status = 'cancelled';
  booking.cancelReason = cleanText(req.body?.reason, 200);
  booking.updatedAt = new Date().toISOString();
  refundIfPaid(db, booking);
  await save();
  return res.json({ booking: presentBooking(db, booking) });
}));

router.patch('/:id/status', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const status = rules.oneOf(BOOKING_STATUSES, 'status')(req.body?.status);
  if (status.error) return badRequest(res, { status: status.error });

  const db = getDb();
  const booking = db.bookings.find((item) => item.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });

  booking.status = status.value;
  booking.updatedAt = new Date().toISOString();
  if (status.value === 'cancelled') refundIfPaid(db, booking);
  await save();
  return res.json({ booking: presentBooking(db, booking) });
}));

export default router;

function refundIfPaid(db, booking) {
  if (booking.paymentStatus !== 'paid') return;
  booking.paymentStatus = 'refunded';
  const payment = [...db.payments].reverse().find((item) => item.bookingId === booking.id && item.status === 'paid');
  if (payment) payment.status = 'refunded';
}
