import { Router } from 'express';
import { authenticate, requireTier } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { clusterTriggers, detectEscalation, detectTrends } from '../services/ai.js';
import { subDays } from 'date-fns';

const router = Router();

// POST /api/patterns/cluster  — run AI clustering on recent triggers
router.post('/cluster', authenticate, requireTier('pro', 'executive'), async (req, res, next) => {
  try {
    const { days = 30 } = req.body;
    const since = subDays(new Date(), Number(days));

    const result = await query(
      'SELECT * FROM triggers WHERE user_id = $1 AND occurred_at >= $2 ORDER BY occurred_at DESC',
      [req.user.id, since],
      req.user.id
    );

    if (result.rows.length < 3) {
      return res.status(400).json({ error: 'Need at least 3 triggers to generate patterns' });
    }

    const clusters = await clusterTriggers(result.rows);

    // Persist clusters
    const saved = [];
    for (const cluster of clusters) {
      const row = await query(
        `INSERT INTO pattern_clusters
          (user_id, cluster_name, description, trigger_ids, centroid_emotion,
           avg_intensity, escalation_risk, ai_insights, regulation_suggestions, last_seen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [
          req.user.id, cluster.name, cluster.description,
          cluster.trigger_ids, cluster.centroid_emotion, cluster.avg_intensity,
          cluster.escalation_risk, JSON.stringify({ insights: cluster.insights }),
          cluster.regulation_suggestions,
        ],
        req.user.id
      );
      if (row.rows[0]) saved.push(row.rows[0]);
    }

    // Tag triggers with cluster ids
    for (const cluster of clusters) {
      const savedCluster = saved.find((s) => s.cluster_name === cluster.name);
      if (savedCluster && cluster.trigger_ids?.length) {
        await query(
          `UPDATE triggers SET cluster_id = $1 WHERE id = ANY($2::uuid[]) AND user_id = $3`,
          [savedCluster.id, cluster.trigger_ids, req.user.id]
        );
      }
    }

    res.json({ clusters: saved, raw: clusters });
  } catch (err) {
    next(err);
  }
});

// GET /api/patterns  — list saved clusters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM pattern_clusters WHERE user_id = $1 ORDER BY last_seen DESC',
      [req.user.id],
      req.user.id
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/patterns/escalation
router.get('/escalation', authenticate, requireTier('pro', 'executive'), async (req, res, next) => {
  try {
    const recent = await query(
      `SELECT * FROM triggers WHERE user_id = $1 AND occurred_at >= $2`,
      [req.user.id, subDays(new Date(), 7)],
      req.user.id
    );

    const historical = await query(
      `SELECT AVG(intensity) as avg FROM triggers WHERE user_id = $1 AND occurred_at < $2`,
      [req.user.id, subDays(new Date(), 7)],
      req.user.id
    );

    const histAvg = historical.rows[0]?.avg || 5;
    const analysis = await detectEscalation(recent.rows, Number(histAvg));
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

// GET /api/patterns/trends
router.get('/trends', authenticate, requireTier('pro', 'executive'), async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = subDays(new Date(), Number(days));

    const result = await query(
      'SELECT * FROM triggers WHERE user_id = $1 AND occurred_at >= $2 ORDER BY occurred_at ASC',
      [req.user.id, since],
      req.user.id
    );

    const trends = await detectTrends(result.rows);
    res.json(trends);
  } catch (err) {
    next(err);
  }
});

export default router;
