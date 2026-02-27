import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import authRoutes from './routes/auth.js'
import triggersRoutes from './routes/triggers.js'
import scoresRoutes from './routes/scores.js'
import patternsRoutes from './routes/patterns.js'
import summariesRoutes from './routes/summaries.js'
import subscriptionsRoutes from './routes/subscriptions.js'
import webhooksRoutes from './routes/webhooks.js'
import adminRoutes from './routes/admin.js'
import relationshipsRoutes from './routes/relationships.js'

import { authenticate } from './middleware/auth.js'

const app = express()
const PORT = process.env.PORT || 4000

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────

app.use(
  cors({
    origin: true,
    credentials: true,
  })
)

// ─────────────────────────────────────────────
// Body parsing
// ─────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }))

// ─────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes)
app.use('/api/webhooks', webhooksRoutes)

// ─────────────────────────────────────────────
// PROTECTED ROUTES
// ─────────────────────────────────────────────

app.use('/api/scores', authenticate, scoresRoutes)
app.use('/api/triggers', authenticate, triggersRoutes)
app.use('/api/patterns', authenticate, patternsRoutes)
app.use('/api/summaries', authenticate, summariesRoutes)
app.use('/api/subscriptions', authenticate, subscriptionsRoutes)
app.use('/api/admin', authenticate, adminRoutes)
app.use('/api/relationships', authenticate, relationshipsRoutes)

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// ─────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Emotional Trigger API running on port ${PORT}`)
})

export default app