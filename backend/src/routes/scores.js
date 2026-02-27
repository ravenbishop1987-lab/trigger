import { Router } from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// GET latest score
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM emotion_scores
      WHERE user_id = $1
      ORDER BY period_end DESC
      LIMIT 1
      `,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return res.json({
        composite_score: 0,
        stability_score: 0,
        reactivity_index: 0,
        trigger_density_score: 0,
        recovery_speed_score: 0,
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error('Scores error:', err)
    res.status(500).json({ error: 'Failed to fetch scores' })
  }
})

// GET history
router.get('/history', authenticate, async (req, res) => {
  try {
    const months = Number(req.query.months || 12)

    const result = await pool.query(
      `
      SELECT *
      FROM emotion_scores
      WHERE user_id = $1
      ORDER BY period_end DESC
      LIMIT $2
      `,
      [req.user.id, months]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('Scores history error:', err)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// GET heatmap
router.get('/heatmap', authenticate, async (req, res) => {
  try {
    const days = Number(req.query.days || 90)

    const result = await pool.query(
      `
      SELECT DATE(occurred_at) as day, COUNT(*) as count
      FROM triggers
      WHERE user_id = $1
        AND occurred_at >= NOW() - INTERVAL '${days} days'
      GROUP BY day
      ORDER BY day ASC
      `,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('Heatmap error:', err)
    res.status(500).json({ error: 'Failed to fetch heatmap' })
  }
})

export default router