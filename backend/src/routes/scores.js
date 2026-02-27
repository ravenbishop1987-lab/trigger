import { Router } from 'express'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  const result = await query(
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
})

export default router