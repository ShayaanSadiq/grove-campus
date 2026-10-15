import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { getDb, save } from '../db.js';
import { DEPARTMENTS } from '../lib/constants.js';
import { badRequest, collect, rules, toPublicUser } from '../lib/validators.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler, authLimiter } from '../middleware/errors.js';

const router = Router();

router.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const parsed = collect(req.body, {
    name: rules.name,
    department: rules.department(DEPARTMENTS),
    phone: rules.phone,
    studentId: rules.studentId,
  });
  if (!parsed.ok) return badRequest(res, parsed.fields);

  const db = getDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Sign in again to continue.' });
  if (db.users.some((item) => item.id !== user.id && item.studentId === parsed.value.studentId)) {
    return res.status(409).json({ error: 'That student ID is already registered.', fields: { studentId: 'This ID is already in use.' } });
  }

  user.name = parsed.value.name;
  user.department = parsed.value.department;
  user.phone = parsed.value.phone;
  user.studentId = parsed.value.studentId;
  await save();
  return res.json({ user: toPublicUser(user) });
}));

router.patch('/me/password', requireAuth, authLimiter, asyncHandler(async (req, res) => {
  const parsed = collect(req.body, {
    currentPassword: rules.password,
    newPassword: rules.password,
  });
  if (!parsed.ok) return badRequest(res, parsed.fields);
  if (parsed.value.currentPassword === parsed.value.newPassword) {
    return badRequest(res, { newPassword: 'Choose a different password.' });
  }

  const db = getDb();
  const user = db.users.find((item) => item.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Sign in again to continue.' });
  const matches = await bcrypt.compare(parsed.value.currentPassword, user.passwordHash);
  if (!matches) return res.status(401).json({ error: 'Current password is incorrect.', fields: { currentPassword: 'Current password is incorrect.' } });

  user.passwordHash = await bcrypt.hash(parsed.value.newPassword, 10);
  await save();
  return res.json({ ok: true });
}));

export default router;
