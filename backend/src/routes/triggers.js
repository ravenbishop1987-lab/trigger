import { Router } from "express"
import { authenticate } from "../middleware/auth.js"
import { query } from "../db/pool.js"

const router = Router()

router.use(authenticate)

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200)
    const offset = Math.max(Number(req.query.offset || 0), 0)

    const result = await query(
      `SELECT *
       FROM triggers
       WHERE user_id = $1
       ORDER BY occurred_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    )

    res.json({ data: result.rows })
  } catch (err) {
    next(err)
  }
})

router.post("/", async (req, res, next) => {
  try {
    const {
      title,
      description,
      emotion_category = "other",
      intensity = 5,
      body_sensation = null,
      context_tags = [],
      location = null,
      people_involved = [],
      thought_pattern = null,
      regulation_used = null,
      recovery_minutes = null,
      occurred_at = null,
    } = req.body || {}

    if (!title || String(title).trim().length === 0) {
      return res.status(400).json({ error: "title is required" })
    }

    const result = await query(
      `INSERT INTO triggers
       (user_id, title, description, emotion_category, intensity, body_sensation, context_tags, location,
        people_involved, thought_pattern, regulation_used, recovery_minutes, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, COALESCE($13, NOW()))
       RETURNING *`,
      [
        req.user.id,
        title,
        description,
        emotion_category,
        intensity,
        body_sensation,
        context_tags,
        location,
        people_involved,
        thought_pattern,
        regulation_used,
        recovery_minutes,
        occurred_at,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

router.get("/:id", async (req, res, next) => {
  try {
    const result = await query(
      `SELECT *
       FROM triggers
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: "Not found" })
    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

router.patch("/:id", async (req, res, next) => {
  try {
    const fields = req.body || {}
    const allowed = [
      "title",
      "description",
      "emotion_category",
      "intensity",
      "body_sensation",
      "context_tags",
      "location",
      "people_involved",
      "thought_pattern",
      "regulation_used",
      "recovery_minutes",
      "occurred_at",
      "cluster_id",
    ]

    const keys = Object.keys(fields).filter((k) => allowed.includes(k))
    if (keys.length === 0) return res.status(400).json({ error: "No valid fields to update" })

    const setSql = keys.map((k, i) => `${k} = $${i + 3}`).join(", ")
    const params = [req.params.id, req.user.id, ...keys.map((k) => fields[k])]

    const result = await query(
      `UPDATE triggers
       SET ${setSql}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      params
    )

    if (!result.rows[0]) return res.status(404).json({ error: "Not found" })
    res.json(result.rows[0])
  } catch (err) {
    next(err)
  }
})

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM triggers
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    )

    if (!result.rows[0]) return res.status(404).json({ error: "Not found" })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router