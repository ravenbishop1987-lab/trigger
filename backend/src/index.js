import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import triggersRoutes from './routes/triggers.js';
import scoresRoutes from './routes/scores.js';
import patternsRoutes from './routes/patterns.js';
import summariesRoutes from './routes/summaries.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import webhooksRoutes from './routes/webhooks.js';
import adminRoutes from './routes/admin.js';
import relationshipsRoutes from './routes/relationships.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Raw body for Stripe webhooks (must come before JSON parser)
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// ── Global rate limiting ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/triggers', triggersRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/patterns', patternsRoutes);
app.use('/api/summaries', summariesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/relationships', relationshipsRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`🧠 Emotional Trigger API running on port ${PORT}`));

export default app;
