// ============================================================
// WEEKLY SUMMARIES ROUTE
// ============================================================
import { Router as SummaryRouter } from 'express';
import { authenticate, requireTier } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { generateWeeklySummary } from '../services/ai.js';
import { buildScoreSnapshot } from '../services/scoring.js';
import { startOfWeek, endOfWeek, subWeeks, format } from 'date-fns';

export const summariesRouter = SummaryRouter();

summariesRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM weekly_summaries WHERE user_id = $1 ORDER BY week_start DESC LIMIT 10',
      [req.user.id],
      req.user.id
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

summariesRouter.post('/generate', authenticate, requireTier('pro', 'executive'), async (req, res, next) => {
  try {
    const { week_offset = 0 } = req.body;
    const targetWeek = subWeeks(new Date(), Number(week_offset));
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

    const triggers = await query(
      'SELECT * FROM triggers WHERE user_id = $1 AND occurred_at >= $2 AND occurred_at <= $3',
      [req.user.id, weekStart, weekEnd],
      req.user.id
    );

    const snap = buildScoreSnapshot(triggers.rows, 7);
    const aiSummary = await generateWeeklySummary(req.user.id, snap, triggers.rows);

    const saved = await query(
      `INSERT INTO weekly_summaries
        (user_id, week_start, week_end, summary_text, key_insights, top_triggers,
         regulation_recommendations, score_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id, week_start) DO UPDATE SET
         summary_text = EXCLUDED.summary_text,
         key_insights = EXCLUDED.key_insights,
         top_triggers = EXCLUDED.top_triggers,
         regulation_recommendations = EXCLUDED.regulation_recommendations,
         score_snapshot = EXCLUDED.score_snapshot
       RETURNING *`,
      [
        req.user.id, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'),
        aiSummary.summary_text, aiSummary.key_insights, aiSummary.top_triggers,
        aiSummary.regulation_recommendations, JSON.stringify(snap),
      ],
      req.user.id
    );

    res.json(saved.rows[0]);
  } catch (err) {
    next(err);
  }
});


// ============================================================
// SUBSCRIPTIONS ROUTE
// ============================================================
import { Router as SubRouter } from 'express';
import Stripe from 'stripe';

export const subscriptionsRouter = SubRouter();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID,
  executive: process.env.STRIPE_EXECUTIVE_PRICE_ID,
};

subscriptionsRouter.get('/status', authenticate, async (req, res, next) => {
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

subscriptionsRouter.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const { tier } = req.body;
    if (!PRICE_IDS[tier]) return res.status(400).json({ error: 'Invalid tier' });

    // Get or create Stripe customer
    let subResult = await query('SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1', [req.user.id]);
    let customerId = subResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.full_name,
        metadata: { user_id: req.user.id },
      });
      customerId = customer.id;
      await query(
        'UPDATE subscriptions SET stripe_customer_id = $1 WHERE user_id = $2',
        [customerId, req.user.id]
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[tier], quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/settings/billing?canceled=true`,
      metadata: { user_id: req.user.id, tier },
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

subscriptionsRouter.post('/portal', authenticate, async (req, res, next) => {
  try {
    const subResult = await query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.user.id]
    );
    const customerId = subResult.rows[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No billing account found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});


// ============================================================
// STRIPE WEBHOOKS ROUTE
// ============================================================
import { Router as WebhookRouter } from 'express';
export const webhooksRouter = WebhookRouter();

webhooksRouter.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, tier } = session.metadata;
        const stripeSubId = session.subscription;

        const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
        await query(
          `UPDATE subscriptions SET
            tier = $1, status = 'active',
            stripe_subscription_id = $2,
            current_period_start = to_timestamp($3),
            current_period_end = to_timestamp($4)
           WHERE user_id = $5`,
          [
            tier, stripeSubId,
            stripeSub.current_period_start,
            stripeSub.current_period_end,
            user_id,
          ]
        );
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const customer = await stripe.customers.retrieve(sub.customer);
        const userId = customer.metadata.user_id;

        await query(
          `UPDATE subscriptions SET
            status = $1,
            current_period_start = to_timestamp($2),
            current_period_end = to_timestamp($3),
            cancel_at_period_end = $4
           WHERE stripe_subscription_id = $5`,
          [
            sub.status, sub.current_period_start,
            sub.current_period_end, sub.cancel_at_period_end,
            sub.id,
          ]
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
