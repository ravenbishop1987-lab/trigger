# TriggerIQ — Emotional Trigger Intelligence Platform

Full-stack SaaS for tracking, analyzing, and understanding emotional trigger patterns using AI.

---

## 1. FOLDER STRUCTURE

```
emotional-trigger-saas/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Express server entry
│   │   ├── db/
│   │   │   └── pool.js               # PostgreSQL connection pool
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT auth, role & tier middleware
│   │   ├── routes/
│   │   │   ├── auth.js               # Register, login, /me
│   │   │   ├── triggers.js           # CRUD triggers + regulation
│   │   │   ├── scores.js             # Score computation + heatmap
│   │   │   ├── patterns.js           # AI clustering + escalation
│   │   │   ├── summaries.js          # Weekly AI summaries
│   │   │   ├── subscriptions.js      # Stripe checkout + portal
│   │   │   ├── webhooks.js           # Stripe webhook handler
│   │   │   ├── admin.js              # Admin stats
│   │   │   └── relationships.js      # Partner/therapist linking
│   │   └── services/
│   │       ├── ai.js                 # OpenAI calls (classify, cluster, etc.)
│   │       └── scoring.js            # Scoring engine (pure math functions)
│   ├── schema.sql                    # PostgreSQL schema with RLS
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                   # Routes + auth guard
│   │   ├── store/
│   │   │   └── authStore.ts          # Zustand auth state (persisted)
│   │   ├── services/
│   │   │   └── api.ts                # Axios client + API helpers
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx     # Executive snapshot
│   │   │   ├── TriggersPage.tsx      # History + delete + regulation
│   │   │   ├── NewTriggerPage.tsx    # Full trigger entry form
│   │   │   ├── PatternsPage.tsx      # AI cluster view
│   │   │   ├── WeeklySummaryPage.tsx # AI summary view
│   │   │   └── SettingsPage.tsx      # Billing + account
│   │   └── components/
│   │       ├── Layout.tsx            # Sidebar navigation shell
│   │       └── dashboard/
│   │           ├── VolatilityGraph.tsx
│   │           ├── TriggerHeatmap.tsx
│   │           ├── TopCategories.tsx
│   │           ├── RecentTriggers.tsx
│   │           └── ScoreGauge.tsx
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── vercel.json
│
├── render.yaml                       # Render deployment config
└── README.md
```

---

## 2. LOCAL DEVELOPMENT

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key
- Stripe account (for payments)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your values

# Create database
createdb triggeriq

# Run schema
psql triggeriq < schema.sql

npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000/api

npm run dev
```

---

## 3. API ROUTES SUMMARY

| Method | Route | Auth | Tier | Description |
|--------|-------|------|------|-------------|
| POST | /api/auth/register | — | — | Create account |
| POST | /api/auth/login | — | — | Login |
| GET | /api/auth/me | ✓ | — | Current user |
| GET | /api/triggers | ✓ | free+ | List triggers |
| POST | /api/triggers | ✓ | free+ | Create trigger |
| PATCH | /api/triggers/:id | ✓ | free+ | Update trigger |
| DELETE | /api/triggers/:id | ✓ | free+ | Delete trigger |
| POST | /api/triggers/:id/regulation | ✓ | free+ | AI regulation script |
| GET | /api/scores/current | ✓ | free+ | Live score snapshot |
| GET | /api/scores/history | ✓ | free+ | Historical scores |
| GET | /api/scores/heatmap | ✓ | free+ | Daily heatmap data |
| POST | /api/scores/compute | ✓ | free+ | Force compute + save |
| GET | /api/patterns | ✓ | free+ | List clusters |
| POST | /api/patterns/cluster | ✓ | pro+ | Run AI clustering |
| GET | /api/patterns/escalation | ✓ | pro+ | Escalation analysis |
| GET | /api/patterns/trends | ✓ | pro+ | Trend detection |
| GET | /api/summaries | ✓ | free+ | List summaries |
| POST | /api/summaries/generate | ✓ | pro+ | Generate AI summary |
| GET | /api/subscriptions/status | ✓ | — | Subscription status |
| POST | /api/subscriptions/checkout | ✓ | — | Stripe checkout |
| POST | /api/subscriptions/portal | ✓ | — | Billing portal |
| POST | /api/webhooks/stripe | — | — | Stripe events |
| GET | /api/admin/users | ✓ | admin | All users |
| GET | /api/admin/stats | ✓ | admin | Platform stats |

---

## 4. SCORING ENGINE FORMULAS

### Emotional Stability Score (0–100)
```
score = 100 - (avg/10)*40 - (stdDev/10)*30 - (highRatio)*30
where highRatio = count(intensity >= 8) / total
```

### Reactivity Index (0–100)
```
score = 100 - (weightedAvgIntensity / 10) * 100
weight = 1.5 if minutesSincePriorEntry > 30 else 1.0
```

### Trigger Density Score (0–100)
```
density = triggerCount / daysInPeriod
score = 100 - min(density * 20, 100)
```

### Recovery Speed Score (0–100)
```
score = 100 - min((avgRecoveryMinutes / 120) * 100, 100)
```

### Composite Score
```
composite = stability*0.35 + reactivity*0.25 + density*0.20 + recovery*0.20
```

---

## 5. DEPLOYMENT

### Backend → Render

1. Push code to GitHub
2. Create new Web Service on render.com
3. Connect repo, set root dir to `backend`
4. Add environment variables from `.env.example`
5. Create PostgreSQL database on Render
6. Run `psql $DATABASE_URL < schema.sql`
7. Set `FRONTEND_URL` to your Vercel domain

### Frontend → Vercel

```bash
cd frontend
npx vercel --prod
# Set VITE_API_URL to your Render backend URL
```

### Stripe Webhooks

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:4000/api/webhooks/stripe

# In production, add webhook endpoint in Stripe Dashboard:
# https://your-api.onrender.com/api/webhooks/stripe
# Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
```

---

## 6. SUBSCRIPTION TIERS

| Feature | Free | Pro ($12/mo) | Executive ($29/mo) |
|---------|------|--------------|---------------------|
| Trigger logging | ✓ | ✓ | ✓ |
| Basic scores | ✓ | ✓ | ✓ |
| History view | ✓ | ✓ | ✓ |
| AI clustering | — | ✓ | ✓ |
| Weekly AI summaries | — | ✓ | ✓ |
| Escalation detection | — | ✓ | ✓ |
| Regulation scripts | ✓ | ✓ | ✓ |
| Relationship connect | — | ✓ | ✓ |
| Executive dashboard | — | — | ✓ |
| Advanced trends | — | — | ✓ |

---

## 7. ACCOUNT ROLES

- **user** — Individual emotional tracking (default)
- **couples** — Shared dynamics, can connect partner accounts
- **executive** — Leadership stress and trigger patterns
- **therapist** — Can link to client accounts, view shared data
- **admin** — Full platform access, admin dashboard

Role permissions are enforced via `requireRole()` middleware.
Subscription tier is enforced via `requireTier()` middleware.
