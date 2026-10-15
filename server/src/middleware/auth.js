import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config.js';
import { getDb } from '../db.js';
import { toPublicUser } from '../lib/validators.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function userFromToken(token) {
  const payload = jwt.verify(token, jwtSecret());
  const user = getDb().users.find((item) => item.id === payload.sub);
  if (!user || user.status !== 'active') return null;
  return toPublicUser(user);
}

export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try {
    const user = userFromToken(token);
    if (!user) return res.status(401).json({ error: 'Sign in again to continue.' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Sign in again to continue.' });
  }
}

export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    req.user = userFromToken(token);
  } catch {
    req.user = null;
  }
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have access to that action.' });
    }
    return next();
  };
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtSecret(), { expiresIn: '7d' });
}
