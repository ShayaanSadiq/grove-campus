import crypto from 'crypto';
import { Router } from 'express';
import { getDb, save } from '../db.js';
import { CATEGORIES, SLOTS } from '../lib/constants.js';
import { campusToday, isIsoDate } from '../lib/dates.js';
import { heldCount, presentReview, presentService } from '../lib/present.js';
import { badRequest, cleanText, collect, parseInteger, rules } from '../lib/validators.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

const router = Router();

router.get('/', optionalAuth, (req, res) => {
  const db = getDb();
  const query = cleanText(req.query.q, 80).toLowerCase();
  const category = cleanText(req.query.category, 40);
  const sort = cleanText(req.query.sort, 20) || 'name';
  if (category && !CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Unknown category.', fields: { category: 'Choose a campus category.' } });
  }
  if (!['name', 'price', 'rating', 'newest'].includes(sort)) {
    return res.status(400).json({ error: 'Unknown sort.', fields: { sort: 'Sort by name, price, rating, or newest.' } });
  }

  const minPrice = parseBound(req.query.minPrice, 'minPrice');
  const maxPrice = parseBound(req.query.maxPrice, 'maxPrice');
  if (minPrice.error || maxPrice.error) {
    return badRequest(res, { ...(minPrice.error ? { minPrice: minPrice.error } : {}), ...(maxPrice.error ? { maxPrice: maxPrice.error } : {}) });
  }

  const includeInactive = req.query.includeInactive === '1' && req.user?.role === 'admin';
  let services = db.services
    .filter((service) => includeInactive || service.status === 'active')
    .filter((service) => !category || service.category === category)
    .filter((service) => minPrice.value === null || service.price >= minPrice.value)
    .filter((service) => maxPrice.value === null || service.price <= maxPrice.value)
    .filter((service) => {
      if (!query) return true;
      const haystack = `${service.name} ${service.description} ${service.location} ${service.category}`.toLowerCase();
      return haystack.includes(query);
    })
    .map((service) => presentService(db, service));

  services.sort((a, b) => {
    if (sort === 'price') return a.price - b.price || a.name.localeCompare(b.name);
    if (sort === 'rating') return (b.rating ?? -1) - (a.rating ?? -1) || a.name.localeCompare(b.name);
    if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
    return a.name.localeCompare(b.name);
  });

  const total = services.length;
  const offset = Math.max(parseInteger(req.query.offset) || 0, 0);
  const limit = Math.min(Math.max(parseInteger(req.query.limit) || 50, 1), 100);
  services = services.slice(offset, offset + limit);
  return res.json({ services, total, limit, offset });
});

router.get('/:id/availability', (req, res) => {
  const date = cleanText(req.query.date, 10);
  if (!isIsoDate(date)) return res.status(400).json({ error: 'Choose a valid date.', fields: { date: 'Use a real calendar date.' } });
  if (date < campusToday()) return res.status(400).json({ error: 'Choose today or a future date.', fields: { date: 'Past dates are closed.' } });

  const db = getDb();
  const service = db.services.find((item) => item.id === req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found.' });
  if (service.status !== 'active') return res.status(409).json({ error: 'This service is not open for booking.' });

  return res.json({
    date,
    slots: service.slots.map((time) => ({
      time,
      capacity: service.capacity,
      remaining: Math.max(0, service.capacity - heldCount(db, service.id, date, time)),
    })),
  });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const service = db.services.find((item) => item.id === req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found.' });
  const reviews = db.feedback
    .filter((item) => item.serviceId === service.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((item) => presentReview(db, item));
  return res.json({ service: presentService(db, service), reviews });
});

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const parsed = parseService(req.body);
  if (!parsed.ok) return badRequest(res, parsed.fields);
  const db = getDb();
  const service = {
    id: crypto.randomUUID(),
    ...parsed.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.services.push(service);
  await save();
  return res.status(201).json({ service: presentService(db, service) });
}));

router.put('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const parsed = parseService(req.body);
  if (!parsed.ok) return badRequest(res, parsed.fields);
  const db = getDb();
  const service = db.services.find((item) => item.id === req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found.' });
  Object.assign(service, parsed.value, { updatedAt: new Date().toISOString() });
  await save();
  return res.json({ service: presentService(db, service) });
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const db = getDb();
  const index = db.services.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Service not found.' });
  const used = db.bookings.some((item) => item.serviceId === req.params.id);
  if (used) {
    db.services[index].status = 'inactive';
    db.services[index].updatedAt = new Date().toISOString();
    await save();
    return res.json({ deactivated: true, service: presentService(db, db.services[index]) });
  }
  const [removed] = db.services.splice(index, 1);
  await save();
  return res.json({ deleted: true, service: presentService(db, removed) });
}));

export default router;

function parseBound(raw, label) {
  if (raw === undefined || raw === '') return { value: null };
  const value = parseInteger(raw);
  if (value === null || value < 0 || value > 100000) return { error: `${label} must be a whole number from 0 to 100000.` };
  return { value };
}

function parseSlots(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'Choose at least one time slot.' };
  const unique = [...new Set(raw.map((slot) => cleanText(slot, 5)))];
  if (unique.some((slot) => !SLOTS.includes(slot))) return { error: 'Use the campus time slots.' };
  return { value: SLOTS.filter((slot) => unique.includes(slot)) };
}

function parseService(body) {
  const parsed = collect(body, {
    name: rules.text(3, 80, 'Name'),
    category: rules.oneOf(CATEGORIES, 'category'),
    description: rules.text(20, 800, 'Description'),
    location: rules.text(3, 120, 'Location'),
    price: rules.integer(0, 100000, 'Price'),
    durationMinutes: rules.integer(15, 480, 'Duration'),
    capacity: rules.integer(1, 200, 'Capacity'),
    status: rules.oneOf(['active', 'inactive'], 'status'),
  });
  const slots = parseSlots(body?.slots);
  if (slots.error) parsed.fields.slots = slots.error;
  else parsed.value.slots = slots.value;
  parsed.ok = Object.keys(parsed.fields).length === 0;
  return parsed;
}
