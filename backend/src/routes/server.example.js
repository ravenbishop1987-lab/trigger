/**
 * EXAMPLE server.js - Shows how to mount all routes correctly
 * 
 * Copy the route mounting section to your existing server.js/app.js
 */

import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from './routes/auth.js';
import triggersRoutes from './routes/triggers.js';
import scoresRoutes from './routes/scores.js';
import patternsRoutes from './routes/patterns.js';
import summariesRoutes from './routes/summaries.js';
import subscriptionsRoutes from './routes/subscriptions.js';
import webhooksRoutes from './routes/webhooks.js';
import relationshipsRoutes from './routes/relationships.js';
import adminRoutes from './routes/admin.js';

const app = express();

// ===========================================
// IMPORTANT: Webhook route needs raw body
// This MUST come BEFORE express.json()
// ===========================================
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Standard middleware
app.use(cors());
app.use(express.json());

// ===========================================
// MOUNT ALL ROUTES
// ===========================================
app.use('/api/auth', authRoutes);
app.use('/api/triggers', triggersRoutes);
app.use('/api/scores', scoresRoutes);           // <-- THIS FIXES YOUR 404
app.use('/api/patterns', patternsRoutes);
app.use('/api/summaries', summariesRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/relationships', relationshipsRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Routes mounted:');
  console.log('  - /api/auth');
  console.log('  - /api/triggers');
  console.log('  - /api/scores');
  console.log('  - /api/patterns');
  console.log('  - /api/summaries');
  console.log('  - /api/subscriptions');
  console.log('  - /api/webhooks');
  console.log('  - /api/relationships');
  console.log('  - /api/admin');
});

export default app;
