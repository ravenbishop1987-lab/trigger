import { Router } from 'express';
import { authenticate, requireTier } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import crypto from 'crypto';

const router = Router();

// POST /api/relationships/invite
router.post('/invite', authenticate, requireTier('pro', 'executive'), async (req, res, next) => {
  try {
    const { relationship_type = 'partner' } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const result = await query(
      `INSERT INTO relationships (initiator_id, relationship_type, invite_token, invite_expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, relationship_type, token, expires]
    );

    res.json({
      invite_token: token,
      invite_url: `${process.env.FRONTEND_URL}/connect?token=${token}`,
      expires_at: expires,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/relationships/accept
router.post('/accept', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body;

    const result = await query(
      `SELECT * FROM relationships WHERE invite_token = $1 AND invite_expires_at > NOW() AND partner_id IS NULL`,
      [token]
    );

    const rel = result.rows[0];
    if (!rel) return res.status(404).json({ error: 'Invalid or expired invite token' });
    if (rel.initiator_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    const updated = await query(
      `UPDATE relationships SET partner_id = $1, status = 'active', invite_token = NULL
       WHERE id = $2 RETURNING *`,
      [req.user.id, rel.id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/relationships
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*,
              u1.full_name as initiator_name, u1.email as initiator_email,
              u2.full_name as partner_name, u2.email as partner_email
       FROM relationships r
       LEFT JOIN users u1 ON r.initiator_id = u1.id
       LEFT JOIN users u2 ON r.partner_id = u2.id
       WHERE r.initiator_id = $1 OR r.partner_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
