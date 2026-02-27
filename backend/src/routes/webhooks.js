import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db/pool.js';

const router = Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

// POST /api/webhooks/stripe
// IMPORTANT: This route needs raw body - apply express.raw() middleware BEFORE express.json()
router.post('/stripe', async (req, res) => {
  if (!stripe) {
    console.error('Stripe not configured');
    return res.status(503).json({ error: 'Payment service not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, tier } = session.metadata || {};
        const stripeSubId = session.subscription;

        if (user_id && tier && stripeSubId) {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
          await query(
            `UPDATE subscriptions SET
              tier = $1, status = 'active',
              stripe_subscription_id = $2,
              current_period_start = to_timestamp($3),
              current_period_end = to_timestamp($4)
             WHERE user_id = $5`,
            [tier, stripeSubId, stripeSub.current_period_start, stripeSub.current_period_end, user_id]
          );
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await query(
          `UPDATE subscriptions SET
            status = $1,
            current_period_start = to_timestamp($2),
            current_period_end = to_timestamp($3),
            cancel_at_period_end = $4
           WHERE stripe_subscription_id = $5`,
          [sub.status, sub.current_period_start, sub.current_period_end, sub.cancel_at_period_end || false, sub.id]
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await query(
          `UPDATE subscriptions SET tier = 'free', status = 'canceled'
           WHERE stripe_subscription_id = $1`,
          [sub.id]
        );
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
