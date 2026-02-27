import { Router } from "express"
import { authenticate } from "../middleware/auth.js"
import { query } from "../db/pool.js"

const router = Router()
router.use(authenticate)

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function computeScoresFromTriggers(triggers) {
  const triggerCount = triggers.length
  const avgIntensity =
    triggerCount === 0 ? 0 : triggers.reduce((a, t) => a + Number(t.intensity || 0), 0) / triggerCount

  const avgRecovery =
    triggerCount === 0
      ? 0
      : triggers.reduce((a, t) => a + Number(t.recovery_minutes || 0), 0) / triggerCount

  const byEmotion = {}
  for (const t of triggers) {
    const e = t.emotion_category || "other"
    byEmotion[e] = (byEmotion[e] || 0) + 1
  }
  const dominantEmotion =
    Object.entries(byEmotion).sort((a, b) => b[1] - a[1])[0]?.[0] || "other"

  const densityPenalty = clamp(triggerCount * 4, 0, 100)
  const intensityPenalty = clamp(avgIntensity * 10, 0, 100)
  const recoveryPenalty = clamp(avgRecovery / 3, 0, 100)

  const stability = clamp(100 - (densityPenalty * 0.5 + intensityPenalty * 0.5), 0, 100)
  const reactivity = clamp(intensityPenalty, 0, 100)
  const density = clamp(densityPenalty, 0, 100)
  const recovery = clamp(100 - recoveryPenalty, 0, 100)

  const composite = clamp((stability + (100 - reactivity) + (100 - density) + recovery) / 4, 0, 100)

  return {
    trigger_count: triggerCount,
    avg_intensity: avgIntensity,
    dominant_emotion: dominantEmotion,
    stability_score: stability,
    reactivity_index: reactivity,
    trigger_density_score: density,
    recovery_speed_score: recovery,
    composite_score: composite,
  }
}

router.get("/current", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM emotion_scores
       WHERE user_id = $1
       ORDER BY computed_at DESC
       LIMIT 1`,
      [req.user.id]
    )

    if (result.rows[0]) return res.json(result.rows[0])

    const triggers = await query(
      `SELECT intensity, emotion_category, recovery_minutes
       FROM triggers
       WHERE user_id = $1 AND occurred_at >= NOW() - INTERVAL '7 days'`,
      [req.user.id]
    )

    const computed = computeScoresFromTriggers(triggers.rows)
    res.json({
      ...computed,
      period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      period_end: new Date().toISOString(),
    })
  } catch (err) {
    next(err)
  }
})

router.get("/history", async (req, res, next) => {
  try {
    const weeks = Number(req.query.weeks || 0)
    const months = Number(req.query.months || 0)

    const intervalWeeks = weeks > 0 ? weeks : months > 0 ? months * 4 : 12

    const result = await query(
      `SELECT *
       FROM emotion_scores
       WHERE user_id = $1
       ORDER BY period_start DESC
       LIMIT $2`,
      [req.user.id, intervalWeeks]
    )

    res.json(result.rows.reverse())
  } catch (err) {
    next(err)
  }
})

router.get("/heatmap", async (req, res, next) => {
  try {
    const days = Math.min(Number(req.query.days || 90), 365)

    const result = await query(
      `SELECT DATE(occurred_at) AS day, COUNT(*)::int AS count
       FROM triggers
       WHERE user_id = $1 AND occurred_at >= NOW() - ($2::text || ' days')::interval
       GROUP BY DATE(occurred_at)
       ORDER BY day ASC`,
      [req.user.id, String(days)]
    )

    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

router.post("/compute", async (req, res, next) => {
  try {
    const days = Math.min(Number(req.body?.days || 7), 90)

    const triggers = await query(
      `SELECT intensity, emotion_category, recovery_minutes
       FROM triggers
       WHERE user_id = $1 AND occurred_at >= NOW() - ($2::text || ' days')::interval`,
      [req.user.id, String(days)]
    )

    const computed = computeScoresFromTriggers(triggers.rows)

    const result = await query(
      `INSERT INTO emotion_scores
       (user_id, period_start, period_end, stability_score, reactivity_index, trigger_density_score,
        recovery_speed_score, composite_score, trigger_count, avg_intensity, dominant_emotion)
       VALUES
       ($1, NOW() - ($2::text || ' days')::interval, NOW(), $3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.user.id,
        String(days),
        computed.stability_score,
        computed.reactivity_index,
        computed.trigger_density_score,
        computed.recovery_speed_score,
        computed.composite_score,
        computed.trigger_count,
        computed.avg_intensity,
        computed.dominant_emotion,
      ]
    )

    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

export default router