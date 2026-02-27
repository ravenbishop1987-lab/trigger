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

const app = express()
const PORT = process.env.PORT || 4000

// ─────────────────────────────────────────────
// 🔥 GLOBAL CORS FIX
// ─────────────────────────────────────────────

// FORCE CORS + PREFLIGHT FIX
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }

  next()
})

// ─────────────────────────────────────────────
// Body parsing
// ─────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }))

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

app.use('/api/auth', authRoutes)
app.use('/api/triggers', triggersRoutes)
app.use('/api/scores', scoresRoutes)
app.use('/api/patterns', patternsRoutes)
app.use('/api/summaries', summariesRoutes)
app.use('/api/subscriptions', subscriptionsRoutes)
app.use('/api/webhooks', webhooksRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/relationships', relationshipsRoutes)

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// ─────────────────────────────────────────────
// Error handler
// ─────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Emotional Trigger API running on port ${PORT}`)
})

export default app