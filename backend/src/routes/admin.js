// admin.js
import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

router.get('/users', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at,
              s.tier, s.status as sub_status,
              COUNT(t.id) as trigger_count
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
       LEFT JOIN triggers t ON t.user_id = u.id
       GROUP BY u.id, s.tier, s.status
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [Number(req.query.limit || 50), Number(req.query.offset || 0)]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (_req, res, next) => {
  try {
    const users = await query('SELECT COUNT(*) FROM users');
    const triggers = await query('SELECT COUNT(*) FROM triggers');
    const paid = await query("SELECT COUNT(*) FROM subscriptions WHERE tier != 'free' AND status = 'active'");
    res.json({
      total_users: Number(users.rows[0].count),
      total_triggers: Number(triggers.rows[0].count),
      paid_subscriptions: Number(paid.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
