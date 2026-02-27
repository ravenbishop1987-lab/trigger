import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

const triggerSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  emotion_category: z.string().optional().default('other'),
  intensity: z.number().min(1).max(10),
  occurred_at: z.string().optional(),
})

// POST /api/triggers
router.post('/', authenticate, async (req, res, next) => {
  try {
    const body = triggerSchema.parse(req.body)

    const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date()

    const result = await query(
      `
      INSERT INTO triggers (user_id, title, description, emotion_category, intensity, occurred_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        req.user.id,
        body.title,
        body.description || null,
        body.emotion_category || 'other',
        body.intensity,
        occurredAt,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    next(err)
  }
})

// GET /api/triggers?limit=30
router.get('/', authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200)

    const result = await query(
      `
      SELECT *
      FROM triggers
      WHERE user_id = $1
      ORDER BY occurred_at DESC
      LIMIT $2
      `,
      [req.user.id, limit]
    )

    res.json({
      data: result.rows,
      meta: { limit, count: result.rows.length },
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/triggers/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const id = req.params.id

    const result = await query(
      `
      DELETE FROM triggers
      WHERE id = $1 AND user_id = $2
      RETURNING id
      `,
      [id, req.user.id]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Trigger not found' })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router