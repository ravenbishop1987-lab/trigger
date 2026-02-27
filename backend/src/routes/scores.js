import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { buildScoreSnapshot } from '../services/scoring.js';
import { subDays, startOfDay, endOfDay } from 'date-fns';

const router = Router();

// GET /api/scores/current  — compute live score for last 7 days
router.get('/current', authenticate, async (req, res, next) => {
  try {
    const end = new Date();
    const start = subDays(end, 7);

    const result = await query(
      `SELECT * FROM triggers
       WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at <= $3`,
      [req.user.id, start, end],
      req.user.id
    );

    const snapshot = buildScoreSnapshot(result.rows, 7);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

// GET /api/scores/history  — saved weekly scores
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { weeks = 12 } = req.query;
    const result = await query(
      `SELECT * FROM emotion_scores
       WHERE user_id = $1
       ORDER BY period_start DESC
       LIMIT $2`,
      [req.user.id, Number(weeks)],
      req.user.id
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/scores/compute  — force compute & save for a date range
router.post('/compute', authenticate, async (req, res, next) => {
  try {
    const { start_date, end_date } = req.body;
    const start = start_date ? new Date(start_date) : subDays(new Date(), 7);
    const end = end_date ? new Date(end_date) : new Date();
    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));

    const triggers = await query(
      `SELECT * FROM triggers
       WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at <= $3`,
      [req.user.id, start, end],
      req.user.id
    );

    const snap = buildScoreSnapshot(triggers.rows, days);

    // Upsert score record
    const saved = await query(
      `INSERT INTO emotion_scores
        (user_id, period_start, period_end, stability_score, reactivity_index,
         trigger_density_score, recovery_speed_score, composite_score,
         trigger_count, avg_intensity, dominant_emotion, score_metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [
        req.user.id, start, end,
        snap.stability_score, snap.reactivity_index,
        snap.trigger_density_score, snap.recovery_speed_score, snap.composite_score,
        snap.trigger_count, snap.avg_intensity, snap.dominant_emotion,
        JSON.stringify({ volatility: snap.volatility }),
      ],
      req.user.id
    );

    res.json({ ...snap, saved: saved.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/scores/heatmap  — daily intensity data for calendar heatmap
router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const { days = 90 } = req.query;
    const since = subDays(new Date(), Number(days));

    const result = await query(
      `SELECT
         DATE(occurred_at AT TIME ZONE 'UTC') as date,
         AVG(intensity)::numeric(4,2) as avg_intensity,
         MAX(intensity) as max_intensity,
         COUNT(*) as count
       FROM triggers
       WHERE user_id = $1 AND occurred_at >= $2
       GROUP BY DATE(occurred_at AT TIME ZONE 'UTC')
       ORDER BY date ASC`,
      [req.user.id, since],
      req.user.id
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
