import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { clientOrigin } from './config.js';
import { API_CATALOG, CATEGORIES, DEPARTMENTS, SLOTS, BOOKING_STATUSES } from './lib/constants.js';
import { getDb, storeName } from './db.js';
import { errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import serviceRoutes from './routes/services.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import feedbackRoutes from './routes/feedback.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));

const origin = clientOrigin();
app.use(cors({ origin: origin === '*' ? true : origin.split(',').map((item) => item.trim()) }));
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'grove', store: storeName() });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'Grove Campus API',
    version: '1.0.0',
    auth: 'Authorization: Bearer <token>',
    endpoints: API_CATALOG,
  });
});

app.get('/api/meta', (_req, res) => {
  const db = getDb();
  const ratings = db.feedback.map((item) => item.rating);
  res.json({
    categories: CATEGORIES,
    departments: DEPARTMENTS,
    slots: SLOTS,
    statuses: BOOKING_STATUSES,
    currency: 'INR',
    publicStats: {
      services: db.services.filter((item) => item.status === 'active').length,
      categories: CATEGORIES.length,
      reviews: ratings.length,
      averageRating: ratings.length ? Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10 : null,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'That API route does not exist.' });
});

const clientDist = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next(error);
    });
  });
}

app.use(errorHandler);
