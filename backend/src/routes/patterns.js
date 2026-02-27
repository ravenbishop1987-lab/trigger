import { Router } from "express"
import { authenticate } from "../middleware/auth.js"
import { query } from "../db/pool.js"

const router = Router()
router.use(authenticate)

router.get("/", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM pattern_clusters
       WHERE user_id = $1
       ORDER BY last_seen DESC
       LIMIT 50`,
      [req.user.id]
    )
    res.json(result.rows)
  } catch (err) {
    next(err)
  }
})

router.post("/cluster", async (req, res, next) => {
  try {
    const days = Math.min(Number(req.body?.days || 30), 365)

    const t = await query(
      `SELECT id, emotion_category, intensity, occurred_at
       FROM triggers
       WHERE user_id = $1 AND occurred_at >= NOW() - ($2::text || ' days')::interval
       ORDER BY occurred_at DESC`,
      [req.user.id, String(days)]
    )

    if (t.rows.length < 3) return res.status(400).json({ error: "Need at least 3 triggers" })

    const byEmotion = new Map()
    for (const row of t.rows) {
      const key = row.emotion_category || "other"
      const arr = byEmotion.get(key) || []
      arr.push(row)
      byEmotion.set(key, arr)
    }

    const saved = []
    for (const [emotion, rows] of byEmotion.entries()) {
      const triggerIds = rows.map((r) => r.id)
      const avgIntensity = rows.reduce((a, r) => a + Number(r.intensity || 0), 0) / rows.length
      const name = String(emotion).toUpperCase() + " Cluster"

      const inserted = await query(
        `INSERT INTO pattern_clusters
         (user_id, cluster_name, description, trigger_ids, centroid_emotion, avg_intensity, frequency, last_seen)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         RETURNING *`,
        [
          req.user.id,
          name,
          `Auto cluster by emotion category: ${emotion}`,
          triggerIds,
          emotion,
          avgIntensity,
          rows.length,
        ]
      )

      if (inserted.rows[0]) saved.push(inserted.rows[0])

      await query(
        `UPDATE triggers
         SET cluster_id = $1
         WHERE user_id = $2 AND id = ANY($3::uuid[])`,
        [inserted.rows[0].id, req.user.id, triggerIds]
      )
    }

    res.json({ clusters: saved })
  } catch (err) {
    next(err)
  }
})

router.get("/escalation", async (_req, res) => {
  res.json({ risk: "low", notes: [] })
})

router.get("/trends", async (_req, res) => {
  res.json({ trends: [] })
})

export default router