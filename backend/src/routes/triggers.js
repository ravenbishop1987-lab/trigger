import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

const triggerSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  emotion_category: z.string(),
  intensity: z.number().min(1).max(10),
})

/* ======================
   CREATE TRIGGER
====================== */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const body = triggerSchema.parse(req.body)

    const result = await query(
      `
      INSERT INTO triggers (
        user_id,
        title,
        description,
        emotion_category,
        intensity
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        req.user.id,
        body.title,
        body.description || null,
        body.emotion_category,
        body.intensity,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    next(err)
  }
})

/* ======================
   GET USER TRIGGERS
====================== */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM triggers
      WHERE user_id = $1
      ORDER BY occurred_at DESC
      `,
      [req.user.id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)
    next(err)
  }
})

export default router