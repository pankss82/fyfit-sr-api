import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  keyGenerator: (req) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
    const clientId = req.headers['x-client-id'] || 'unknown';
    return `${ip}:${clientId}`;
  },
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
});
