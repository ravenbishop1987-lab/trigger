import express from 'express'
import { Pool } from 'pg'

const router = express.Router()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})

// ==============================
// CURRENT SCORE
// ==============================

router.get('/', async (req, res) => {
  try {
    const userId = req.user?.sub

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const result = await pool.query(
      `
      SELECT score, volatility, created_at
      FROM scores
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.json({
        score: 0,
        volatility: 0,
        created_at: null,
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch score' })
  }
})

// ==============================
// SCORE HISTORY
// ==============================

router.get('/history', async (req, res) => {
  try {
    const userId = req.user?.sub

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const months = parseInt(req.query.months) || 6

    const result = await pool.query(
      `
      SELECT score, volatility, created_at
      FROM scores
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '${months} months'
      ORDER BY created_at ASC
      `,
      [userId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch score history' })
  }
})

export default router