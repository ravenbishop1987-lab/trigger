import { Router } from 'express';
import { authenticate, requireTier } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { generateWeeklySummary } from '../services/ai.js';
import { buildScoreSnapshot } from '../services/scoring.js';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

const router = Router();

// GET /api/summaries - List weekly summaries
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM weekly_summaries WHERE user_id = $1 ORDER BY week_start DESC LIMIT 10',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/summaries/generate - Generate weekly summary
router.post('/generate', authenticate, requireTier('pro', 'executive'), async (req, res, next) => {
  try {
    const { week_offset = 0 } = req.body;
    const targetWeek = subWeeks(new Date(), Number(week_offset));
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

    const triggers = await query(
      'SELECT * FROM triggers WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at <= $3',
      [req.user.id, weekStart, weekEnd]
    );

    const snap = buildScoreSnapshot(triggers.rows, 7);
    const aiSummary = await generateWeeklySummary(req.user.id, snap, triggers.rows);

    const saved = await query(
      `INSERT INTO weekly_summaries
        (user_id, week_start, week_end, summary_text, key_insights, top_triggers,
         regulation_recommendations, score_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, week_start) DO UPDATE SET
         summary_text = EXCLUDED.summary_text,
         key_insights = EXCLUDED.key_insights,
         top_triggers = EXCLUDED.top_triggers,
         regulation_recommendations = EXCLUDED.regulation_recommendations,
         score_snapshot = EXCLUDED.score_snapshot
       RETURNING *`,
      [
        req.user.id,
        format(weekStart, 'yyyy-MM-dd'),
        format(weekEnd, 'yyyy-MM-dd'),
        aiSummary.summary_text,
        aiSummary.key_insights,
        aiSummary.top_triggers,
        aiSummary.regulation_recommendations,
        JSON.stringify(snap),
      ]
    );

    res.json(saved.rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
