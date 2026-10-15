import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { getDb, save } from '../db.js';
import { DEPARTMENTS } from '../lib/constants.js';
import { badRequest, collect, rules, toPublicUser } from '../lib/validators.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler, authLimiter } from '../middleware/errors.js';

const router = Router();
const placeholderHash = bcrypt.hashSync('not-a-real-password', 10);

router.post('/register', authLimiter, asyncHandler(async (req, res) => {
  const parsed = collect(req.body, {
    name: rules.name,
    email: rules.email,
    password: rules.password,
    studentId: rules.studentId,
    department: rules.department(DEPARTMENTS),
    phone: rules.phone,
  });
  if (!parsed.ok) return badRequest(res, parsed.fields);

  const db = getDb();
  if (db.users.some((user) => user.email === parsed.value.email)) {
    return res.status(409).json({ error: 'An account with that email already exists.', fields: { email: 'This email is already registered.' } });
  }
  if (db.users.some((user) => user.studentId === parsed.value.studentId)) {
    return res.status(409).json({ error: 'That student ID is already registered.', fields: { studentId: 'This ID is already in use.' } });
  }

  const user = {
    id: crypto.randomUUID(),
    name: parsed.value.name,
    email: parsed.value.email,
    passwordHash: await bcrypt.hash(parsed.value.password, 10),
    role: 'student',
    studentId: parsed.value.studentId,
    department: parsed.value.department,
    phone: parsed.value.phone,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await save();
  const publicUser = toPublicUser(user);
  return res.status(201).json({ user: publicUser, token: signToken(publicUser) });
}));

router.post('/login', authLimiter, asyncHandler(async (req, res) => {
  const parsed = collect(req.body, { email: rules.email, password: rules.password });
  if (!parsed.ok) return badRequest(res, parsed.fields);

  const user = getDb().users.find((item) => item.email === parsed.value.email);
  const hash = user?.passwordHash || placeholderHash;
  const matches = await bcrypt.compare(parsed.value.password, hash);
  if (!user || !matches) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account is suspended. Contact the campus office.' });
  }
  const publicUser = toPublicUser(user);
  return res.json({ user: publicUser, token: signToken(publicUser) });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
