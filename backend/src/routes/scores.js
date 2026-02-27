import express from 'express'
import { query } from '../db/pool.js'

const router = express.Router()

// ─────────────────────────
// CURRENT SCORE
// ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id

    const result = await query(
      `
      SELECT score, volatility, created_at
      FROM scores
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    )

    res.json(result.rows[0] || { score: 0, volatility: 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch score' })
  }
})

// ─────────────────────────
// SCORE HISTORY
// ─────────────────────────
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.id
    const months = parseInt(req.query.months) || 6

    const result = await query(
      `
      SELECT score, volatility, created_at
      FROM scores
      WHERE user_id = $1
        AND created_at >= NOW() - ($2 || ' months')::interval
      ORDER BY created_at ASC
      `,
      [userId, months]
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

// ─────────────────────────
// HEATMAP
// ─────────────────────────
router.get('/heatmap', async (req, res) => {
  try {
    const userId = req.user.id
    const days = parseInt(req.query.days) || 30

    const result = await query(
      `
      SELECT DATE(created_at) as date,
             AVG(score) as avg_score
      FROM scores
      WHERE user_id = $1
        AND created_at >= NOW() - ($2 || ' days')::interval
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at)
      `,
      [userId, days]
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch heatmap' })
  }
})

export default router