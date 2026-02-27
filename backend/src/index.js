import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import rateLimit from "express-rate-limit"

import authRoutes from "./routes/auth.js"
import triggersRoutes from "./routes/triggers.js"
import scoresRoutes from "./routes/scores.js"
import patternsRoutes from "./routes/patterns.js"
import summariesRoutes from "./routes/summaries.js"
import subscriptionsRoutes from "./routes/subscriptions.js"
import webhooksRoutes from "./routes/webhooks.js"
import adminRoutes from "./routes/admin.js"
import relationshipsRoutes from "./routes/relationships.js"

const app = express()
const PORT = process.env.PORT || 4000

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173"

app.use(helmet())
app.use(morgan("combined"))

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    const allowed = [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"]
    if (allowed.includes(origin)) return cb(null, true)
    return cb(new Error("CORS blocked for origin: " + origin))
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions))
app.options("*", cors(corsOptions))

app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }))
app.use(express.json({ limit: "1mb" }))

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use("/api", globalLimiter)

app.get("/", (_req, res) => res.status(200).json({ ok: true }))
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }))

app.use("/api/auth", authRoutes)
app.use("/api/triggers", triggersRoutes)
app.use("/api/scores", scoresRoutes)
app.use("/api/patterns", patternsRoutes)
app.use("/api/summaries", summariesRoutes)
app.use("/api/subscriptions", subscriptionsRoutes)
app.use("/api/webhooks", webhooksRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/relationships", relationshipsRoutes)

app.use((err, _req, res, _next) => {
  console.error(err)
  const msg = err?.message || "Internal server error"
  res.status(500).json({ error: msg })
})

app.listen(PORT, () => console.log("Emotional Trigger API running on port " + PORT))

export default app