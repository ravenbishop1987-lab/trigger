import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const triggerSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  emotion_category: z.string().min(1).max(50),
  intensity: z.number().min(1).max(10),
});

// POST /api/triggers - Create trigger
router.post('/', authenticate, async (req, res, next) => {
  try {
    const body = triggerSchema.parse(req.body);

    const result = await query(
      `INSERT INTO triggers (user_id, title, description, emotion_category, intensity)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, body.title, body.description || null, body.emotion_category, body.intensity]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    console.error('Error creating trigger:', err);
    next(err);
  }
});

// GET /api/triggers - List triggers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM triggers WHERE user_id = $1 ORDER BY occurred_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching triggers:', err);
    next(err);
  }
});

// GET /api/triggers/:id - Get single trigger
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM triggers WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching trigger:', err);
    next(err);
  }
});

// DELETE /api/triggers/:id - Delete trigger
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM triggers WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Trigger not found' });
    }

    res.json({ message: 'Trigger deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting trigger:', err);
    next(err);
  }
});

export default router;
