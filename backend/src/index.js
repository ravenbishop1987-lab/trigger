import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

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

const allowedOrigins = [
  'https://trigger-frontend.onrender.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean)

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`CORS blocked for origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// Put CORS first so even errors return CORS headers
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(helmet())
app.use(morgan('combined'))

// Stripe raw body route must come before json parser
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '1mb' }))

// Rate limiting after CORS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
})

app.use('/api', globalLimiter)
app.use('/api/auth', authLimiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/triggers', triggersRoutes)
app.use('/api/scores', scoresRoutes)
app.use('/api/patterns', patternsRoutes)
app.use('/api/summaries', summariesRoutes)
app.use('/api/subscriptions', subscriptionsRoutes)
app.use('/api/webhooks', webhooksRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/relationships', relationshipsRoutes)

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// 404 handler for API
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

// Global error handler, keep CORS headers intact
app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => console.log(`Emotional Trigger API running on port ${PORT}`))

export default app