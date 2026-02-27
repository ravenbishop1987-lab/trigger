import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

const triggerCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional().nullable(),
  emotion_category: z.string().optional().default('other'),
  intensity: z.number().int().min(1).max(10),
  body_sensation: z.string().optional().nullable(),
  context_tags: z.array(z.string()).optional().default([]),
  location: z.string().optional().nullable(),
  people_involved: z.array(z.string()).optional().default([]),
  thought_pattern: z.string().optional().nullable(),
  regulation_used: z.string().optional().nullable(),
  recovery_minutes: z.number().int().optional().nullable(),
  occurred_at: z.string().optional(),
})

const triggerUpdateSchema = triggerCreateSchema.partial()

// GET /api/triggers?limit=30
router.get('/', authenticate, async (req, res, next) => {
  try {
    const limit = Math.max(1, Math.min(Number(req.query.limit || 30), 200))

    const result = await query(
      `SELECT *
       FROM triggers
       WHERE user_id = $1
       ORDER BY occurred_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    )

    res.json({ data: result.rows, total: result.rows.length })
  } catch (err) {
    next(err)
  }
})

// GET /api/triggers/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM triggers
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [req.params.id, req.user.id]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

// POST /api/triggers
router.post('/', authenticate, async (req, res, next) => {
  try {
    const body = triggerCreateSchema.parse(req.body)

    const occurredAt = body.occurred_at ? new Date(body.occurred_at) : new Date()

    const result = await query(
      `INSERT INTO triggers
        (user_id, title, description, emotion_category, intensity, body_sensation, context_tags, location, people_involved,
         thought_pattern, regulation_used, recovery_minutes, occurred_at)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user.id,
        body.title,
        body.description || null,
        body.emotion_category || 'other',
        body.intensity,
        body.body_sensation || null,
        body.context_tags || [],
        body.location || null,
        body.people_involved || [],
        body.thought_pattern || null,
        body.regulation_used || null,
        body.recovery_minutes ?? null,
        occurredAt,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    next(err)
  }
})

// PATCH /api/triggers/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const body = triggerUpdateSchema.parse(req.body)

    const existing = await query(
      `SELECT id FROM triggers WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [req.params.id, req.user.id]
    )
    if (!existing.rows[0]) return res.status(404).json({ error: 'Not found' })

    const fields = []
    const values = []
    let i = 1

    for (const [k, v] of Object.entries(body)) {
      fields.push(`${k} = $${i}`)
      values.push(v)
      i += 1
    }

    if (fields.length === 0) return res.json({ ok: true })

    values.push(req.params.id)
    values.push(req.user.id)

    const result = await query(
      `UPDATE triggers
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${i} AND user_id = $${i + 1}
       RETURNING *`,
      values
    )

    res.json(result.rows[0])
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors })
    next(err)
  }
})

// DELETE /api/triggers/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM triggers
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router