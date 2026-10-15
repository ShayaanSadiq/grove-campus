import rateLimit from 'express-rate-limit';

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Wait a few minutes and try again.' },
});

export function authLimiter(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();
  return limiter(req, res, next);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: 'The request body is not valid JSON.' });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
  });
}
