import { Router } from 'express'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET /api/scores
// Returns the latest score row, or a default object
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        stability_score,
        reactivity_index,
        trigger_density_score,
        recovery_speed_score,
        composite_score,
        trigger_count,
        avg_intensity,
        dominant_emotion,
        computed_at
      FROM emotion_scores
      WHERE user_id = $1
      ORDER BY computed_at DESC
      LIMIT 1
      `,
      [req.user.id]
    )

    const row = result.rows[0]

    if (!row) {
      return res.json({
        stability_score: 0,
        reactivity_index: 0,
        trigger_density_score: 0,
        recovery_speed_score: 0,
        composite_score: 0,
        trigger_count: 0,
        avg_intensity: 0,
        dominant_emotion: null,
        computed_at: null,
        volatility: { trend: 'stable' },
      })
    }

    // Simple volatility stub, you can improve later
    res.json({
      ...row,
      volatility: { trend: 'stable' },
    })
  } catch (err) {
    console.error('scores current error:', err)
    res.status(500).json({ error: 'Failed to fetch current scores' })
  }
})

// GET /api/scores/history?months=12
router.get('/history', authenticate, async (req, res) => {
  try {
    const months = Number(req.query.months || 6)

    const result = await query(
      `
      SELECT
        period_start,
        period_end,
        stability_score,
        reactivity_index,
        trigger_density_score,
        recovery_speed_score,
        composite_score,
        trigger_count,
        avg_intensity,
        dominant_emotion,
        computed_at
      FROM emotion_scores
      WHERE user_id = $1
        AND computed_at >= NOW() - ($2 * INTERVAL '1 month')
      ORDER BY computed_at ASC
      `,
      [req.user.id, months]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('scores history error:', err)
    res.status(500).json({ error: 'Failed to fetch score history' })
  }
})

// GET /api/scores/heatmap?days=90
router.get('/heatmap', authenticate, async (req, res) => {
  try {
    const days = Number(req.query.days || 30)

    const result = await query(
      `
      SELECT
        DATE(computed_at) AS date,
        AVG(composite_score)::float AS value
      FROM emotion_scores
      WHERE user_id = $1
        AND computed_at >= NOW() - ($2 * INTERVAL '1 day')
      GROUP BY DATE(computed_at)
      ORDER BY DATE(computed_at) ASC
      `,
      [req.user.id, days]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('scores heatmap error:', err)
    res.status(500).json({ error: 'Failed to fetch heatmap' })
  }
})

export default router