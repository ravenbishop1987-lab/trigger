import { Router } from 'express'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

function clampNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// GET /api/scores
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT stability_score, reactivity_index, trigger_density_score, recovery_speed_score, composite_score, computed_at
       FROM emotion_scores
       WHERE user_id = $1
       ORDER BY computed_at DESC
       LIMIT 1`,
      [req.user.id]
    )

    if (!result.rows[0]) {
      return res.json({
        stability_score: 0,
        reactivity_index: 0,
        trigger_density_score: 0,
        recovery_speed_score: 0,
        composite_score: 0,
        volatility: { trend: 'stable' },
      })
    }

    res.json({
      ...result.rows[0],
      volatility: { trend: 'stable' },
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/scores/history?months=12
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const months = clampNumber(req.query.months, 12)
    const safeMonths = Math.max(1, Math.min(months, 24))

    const result = await query(
      `SELECT period_start, period_end, stability_score, reactivity_index, trigger_density_score, recovery_speed_score, composite_score, computed_at
       FROM emotion_scores
       WHERE user_id = $1
         AND computed_at >= NOW() - ($2 || ' months')::interval
       ORDER BY computed_at ASC`,
      [req.user.id, String(safeMonths)]
    )

    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

// GET /api/scores/heatmap?days=90
router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const days = clampNumber(req.query.days, 90)
    const safeDays = Math.max(7, Math.min(days, 365))

    const result = await query(
      `SELECT DATE(occurred_at) AS day, COUNT(*)::int AS count, AVG(intensity)::float AS avg_intensity
       FROM triggers
       WHERE user_id = $1
         AND occurred_at >= NOW() - ($2 || ' days')::interval
       GROUP BY DATE(occurred_at)
       ORDER BY day ASC`,
      [req.user.id, String(safeDays)]
    )

    res.json(
      result.rows.map((r) => ({
        day: r.day,
        count: r.count,
        avg_intensity: r.avg_intensity || 0,
      }))
    )
  } catch (err) {
    next(err)
  }
})

export default router