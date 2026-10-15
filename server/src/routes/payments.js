import crypto from 'crypto';
import { Router } from 'express';
import { getDb, save } from '../db.js';
import { PAYMENT_METHODS } from '../lib/constants.js';
import { presentBooking } from '../lib/present.js';
import { charge } from '../lib/payment.js';
import { badRequest, cleanText, rules } from '../lib/validators.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();

router.post('/', requireAuth, requireRole('student'), asyncHandler(async (req, res) => {
  const method = rules.oneOf(PAYMENT_METHODS, 'payment method')(req.body?.method);
  if (method.error) return badRequest(res, { method: method.error });

  const db = getDb();
  const bookingId = cleanText(req.body?.bookingId, 60);
  const booking = db.bookings.find((item) => item.id === bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.userId !== req.user.id) return res.status(403).json({ error: 'You can only pay for your own booking.' });
  if (booking.status === 'cancelled') return res.status(409).json({ error: 'Cancelled bookings cannot be paid.' });
  if (booking.paymentStatus === 'not_required') return res.status(400).json({ error: 'This service has no charge.' });
  if (booking.paymentStatus === 'paid') return res.status(409).json({ error: 'This booking is already paid.' });

  const result = charge({ method: method.value, card: req.body?.card });
  if (!result.ok) {
    return res.status(result.declined ? 402 : 400).json({ error: result.error, fields: result.fields || {} });
  }

  const payment = {
    id: crypto.randomUUID(),
    bookingId: booking.id,
    userId: req.user.id,
    amount: booking.amount,
    method: method.value,
    brand: result.brand,
    last4: result.last4,
    status: 'paid',
    transactionId: result.transactionId,
    createdAt: new Date().toISOString(),
  };
  db.payments.push(payment);
  booking.paymentStatus = 'paid';
  if (booking.status === 'pending') booking.status = 'confirmed';
  booking.updatedAt = payment.createdAt;
  await save();

  return res.status(201).json({
    payment: {
      id: payment.id,
      method: payment.method,
      brand: payment.brand,
      last4: payment.last4,
      amount: payment.amount,
      status: payment.status,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt,
    },
    booking: presentBooking(db, booking),
  });
}));

export default router;
