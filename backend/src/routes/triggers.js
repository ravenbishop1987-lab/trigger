import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { classifyEmotion, generateRegulationScript } from '../services/ai.js';

const router = Router();

const triggerSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  emotion_category: z.enum([
    'anger','fear','sadness','joy','disgust','surprise',
    'shame','anxiety','grief','frustration','overwhelm','calm','other'
  ]).default('other'),
  intensity: z.number().int().min(1).max(10),
  body_sensation: z.string().optional(),
  context_tags: z.array(z.string()).default([]),
  location: z.string().optional(),
  people_involved: z.array(z.string()).default([]),
  thought_pattern: z.string().optional(),
  regulation_used: z.string().optional(),
  recovery_minutes: z.number().int().min(0).optional(),
  occurred_at: z.string().datetime().optional(),
});

// POST /api/triggers
router.post('/', authenticate, async (req, res, next) => {
  try {
    const body = triggerSchema.parse(req.body);

    // Run AI classification in background (non-blocking for MVP)
    let aiClassification = {};
    try {
      aiClassification = await classifyEmotion(body.description || body.title, body.emotion_category);
    } catch (e) {
      console.warn('AI classification failed:', e.message);
    }

    const result = await query(
      `INSERT INTO triggers
        (user_id, title, description, emotion_category, intensity, body_sensation,
         context_tags, location, people_involved, thought_pattern, regulation_used,
         recovery_minutes, ai_classification, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.id, body.title, body.description, body.emotion_category, body.intensity,
        body.body_sensation, body.context_tags, body.location, body.people_involved,
        body.thought_pattern, body.regulation_used, body.recovery_minutes,
        aiClassification, body.occurred_at || new Date(),
      ],
      req.user.id
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// GET /api/triggers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      limit = 50,
      offset = 0,
      emotion_category,
      min_intensity,
      max_intensity,
      start_date,
      end_date,
      tag,
    } = req.query;

    let where = 'WHERE user_id = $1';
    const params = [req.user.id];
    let idx = 2;

    if (emotion_category) { where += ` AND emotion_category = $${idx++}`; params.push(emotion_category); }
    if (min_intensity)    { where += ` AND intensity >= $${idx++}`; params.push(Number(min_intensity)); }
    if (max_intensity)    { where += ` AND intensity <= $${idx++}`; params.push(Number(max_intensity)); }
    if (start_date)       { where += ` AND occurred_at >= $${idx++}`; params.push(start_date); }
    if (end_date)         { where += ` AND occurred_at <= $${idx++}`; params.push(end_date); }
    if (tag)              { where += ` AND $${idx++} = ANY(context_tags)`; params.push(tag); }

    params.push(Number(limit), Number(offset));

    const result = await query(
      `SELECT * FROM triggers ${where}
       ORDER BY occurred_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params,
      req.user.id
    );

    const count = await query(
      `SELECT COUNT(*) FROM triggers ${where}`,
      params.slice(0, -2),
      req.user.id
    );

    res.json({ data: result.rows, total: Number(count.rows[0].count) });
  } catch (err) {
    next(err);
  }
});

// GET /api/triggers/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM triggers WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
      req.user.id
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Trigger not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/triggers/:id
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const body = triggerSchema.partial().parse(req.body);
    const fields = Object.keys(body);
    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map((f) => body[f]);

    const result = await query(
      `UPDATE triggers SET ${setClause}, updated_at = NOW()
       WHERE id = $${fields.length + 2} AND user_id = $${fields.length + 3}
       RETURNING *`,
      [...values, req.params.id, req.user.id],
      req.user.id
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Trigger not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// DELETE /api/triggers/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM triggers WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id],
      req.user.id
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Trigger not found' });
    res.json({ deleted: req.params.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/triggers/:id/regulation
router.post('/:id/regulation', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM triggers WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id],
      req.user.id
    );
    const trigger = result.rows[0];
    if (!trigger) return res.status(404).json({ error: 'Trigger not found' });

    const script = await generateRegulationScript(trigger);
    res.json({ regulation_script: script });
  } catch (err) {
    next(err);
  }
});

export default router;
