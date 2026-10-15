import crypto from 'crypto';
import { Router } from 'express';
import { getDb, save } from '../db.js';
import { presentBooking, presentReview } from '../lib/present.js';
import { badRequest, cleanText, collect, rules } from '../lib/validators.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const serviceId = cleanText(req.query.serviceId, 60);
  if (!serviceId) {
    if (req.user?.role !== 'admin') {
      return res.status(400).json({ error: 'Choose a service, or sign in as an administrator.' });
    }
    return res.json({
      feedback: [...db.feedback]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((item) => presentReview(db, item)),
    });
  }
  if (!db.services.some((item) => item.id === serviceId)) return res.status(404).json({ error: 'Service not found.' });
  return res.json({
    feedback: db.feedback
      .filter((item) => item.serviceId === serviceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => presentReview(db, item)),
  });
});

router.post('/', requireAuth, requireRole('student'), asyncHandler(async (req, res) => {
  const parsed = collect(req.body, {
    bookingId: (raw) => {
      const value = cleanText(raw, 60);
      return value ? { value } : { error: 'Choose a booking.' };
    },
    rating: rules.integer(1, 5, 'Rating'),
    comment: rules.text(8, 600, 'Comment'),
  });
  if (!parsed.ok) return badRequest(res, parsed.fields);

  const db = getDb();
  const booking = db.bookings.find((item) => item.id === parsed.value.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.userId !== req.user.id) return res.status(403).json({ error: 'You can only review your own booking.' });
  if (booking.status !== 'completed') return res.status(409).json({ error: 'Reviews open after the booking is completed.' });
  if (db.feedback.some((item) => item.bookingId === booking.id)) {
    return res.status(409).json({ error: 'This booking already has a review.' });
  }

  const feedback = {
    id: crypto.randomUUID(),
    bookingId: booking.id,
    userId: req.user.id,
    serviceId: booking.serviceId,
    rating: parsed.value.rating,
    comment: parsed.value.comment,
    createdAt: new Date().toISOString(),
  };
  db.feedback.push(feedback);
  await save();
  return res.status(201).json({ feedback: presentReview(db, feedback), booking: presentBooking(db, booking) });
}));

export default router;
