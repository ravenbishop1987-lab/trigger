import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-in-production';

// ── Token generation ─────────────────────────────────────
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// ── Auth middleware ──────────────────────────────────────
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user data
    const result = await query(
      'SELECT id, email, full_name, role FROM users WHERE id = $1',
      [decoded.sub]
    );
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Role-based permission middleware ─────────────────────
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access restricted to: ${roles.join(', ')}` });
    }
    next();
  };
}

// ── Subscription tier middleware ─────────────────────────
export function requireTier(...tiers) {
  return async (req, res, next) => {
    try {
      const result = await query(
        "SELECT tier, status FROM subscriptions WHERE user_id = $1 AND status IN ('active','trialing')",
        [req.user.id]
      );
      const sub = result.rows[0];
      const userTier = sub?.tier || 'free';

      if (!tiers.includes(userTier)) {
        return res.status(402).json({
          error: 'This feature requires a higher subscription tier',
          required: tiers,
          current: userTier,
        });
      }
      req.subscription = sub;
      next();
    } catch (err) {
      next(err);
    }
  };
}
