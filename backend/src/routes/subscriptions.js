import { Router } from 'express';
import Stripe from 'stripe';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/pool.js';

const router = Router();

// Initialize Stripe safely
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  executive: process.env.STRIPE_EXECUTIVE_PRICE_ID,
};

// Middleware to check Stripe is configured
const requireStripe = (req, res, next) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payment service not configured' });
  }
  next();
};

// GET /api/subscriptions/status
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM subscriptions WHERE user_id = $1 AND status IN ('active','trialing','past_due')",
      [req.user.id]
    );
    res.json(result.rows[0] || { tier: 'free', status: 'active' });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/checkout
router.post('/checkout', authenticate, requireStripe, async (req, res, next) => {
  try {
    const { tier } = req.body;
    if (!PRICE_IDS[tier]) {
      return res.status(400).json({ error: 'Invalid tier' });
    }

    // Get or create Stripe customer
    let subResult = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    let customerId = subResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.full_name,
        metadata: { user_id: String(req.user.id) },
      });
      customerId = customer.id;
      await query(
        `INSERT INTO subscriptions (user_id, stripe_customer_id, tier, status)
         VALUES ($1, $2, 'free', 'active')
         ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = $2`,
        [req.user.id, customerId]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/settings/billing?canceled=true`,
      metadata: { user_id: String(req.user.id), tier },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/subscriptions/portal
router.post('/portal', authenticate, requireStripe, async (req, res, next) => {
  try {
    const subResult = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    const customerId = subResult.rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

export default router;
