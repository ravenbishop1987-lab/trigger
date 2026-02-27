-- ============================================================
-- EMOTIONAL TRIGGER INTELLIGENCE PLATFORM - DATABASE SCHEMA
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM TYPES
CREATE TYPE account_role AS ENUM ('user', 'couples', 'executive', 'therapist', 'admin');
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'executive');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing', 'incomplete');
CREATE TYPE emotion_category AS ENUM ('anger', 'fear', 'sadness', 'joy', 'disgust', 'surprise', 'shame', 'anxiety', 'grief', 'frustration', 'overwhelm', 'calm', 'other');

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role account_role NOT NULL DEFAULT 'user',
  timezone VARCHAR(100) DEFAULT 'UTC',
  avatar_url TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS TABLE
-- ============================================================
CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  emotion_category emotion_category NOT NULL DEFAULT 'other',
  intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
  body_sensation TEXT,
  context_tags TEXT[] DEFAULT '{}',
  location VARCHAR(255),
  people_involved TEXT[],
  thought_pattern TEXT,
  regulation_used TEXT,
  recovery_minutes INTEGER,
  ai_classification JSONB DEFAULT '{}',
  cluster_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EMOTION SCORES TABLE
-- ============================================================
CREATE TABLE emotion_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  stability_score NUMERIC(5,2) CHECK (stability_score >= 0 AND stability_score <= 100),
  reactivity_index NUMERIC(5,2) CHECK (reactivity_index >= 0 AND reactivity_index <= 100),
  trigger_density_score NUMERIC(5,2) CHECK (trigger_density_score >= 0 AND trigger_density_score <= 100),
  recovery_speed_score NUMERIC(5,2) CHECK (recovery_speed_score >= 0 AND recovery_speed_score <= 100),
  composite_score NUMERIC(5,2) CHECK (composite_score >= 0 AND composite_score <= 100),
  trigger_count INTEGER DEFAULT 0,
  avg_intensity NUMERIC(4,2),
  dominant_emotion emotion_category,
  score_metadata JSONB DEFAULT '{}',
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PATTERN CLUSTERS TABLE
-- ============================================================
CREATE TABLE pattern_clusters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cluster_name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_ids UUID[] DEFAULT '{}',
  centroid_emotion emotion_category,
  avg_intensity NUMERIC(4,2),
  frequency INTEGER DEFAULT 1,
  escalation_risk VARCHAR(20) DEFAULT 'low' CHECK (escalation_risk IN ('low', 'medium', 'high', 'critical')),
  ai_insights JSONB DEFAULT '{}',
  regulation_suggestions TEXT[],
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RELATIONSHIPS TABLE (for Couples / Therapist modes)
-- ============================================================
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  relationship_type VARCHAR(50) DEFAULT 'partner' CHECK (relationship_type IN ('partner', 'therapist_client', 'coach_client')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'ended')),
  permissions JSONB DEFAULT '{"can_view_triggers": false, "can_view_scores": true}',
  invite_token VARCHAR(255) UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEEKLY SUMMARIES TABLE
-- ============================================================
CREATE TABLE weekly_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary_text TEXT,
  key_insights TEXT[],
  top_triggers TEXT[],
  regulation_recommendations TEXT[],
  score_snapshot JSONB DEFAULT '{}',
  ai_generated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_triggers_user_id ON triggers(user_id);
CREATE INDEX idx_triggers_occurred_at ON triggers(occurred_at DESC);
CREATE INDEX idx_triggers_cluster_id ON triggers(cluster_id);
CREATE INDEX idx_triggers_emotion_category ON triggers(emotion_category);
CREATE INDEX idx_triggers_intensity ON triggers(intensity);
CREATE INDEX idx_emotion_scores_user_id ON emotion_scores(user_id);
CREATE INDEX idx_emotion_scores_period ON emotion_scores(period_start, period_end);
CREATE INDEX idx_pattern_clusters_user_id ON pattern_clusters(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_weekly_summaries_user_week ON weekly_summaries(user_id, week_start);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_self ON users USING (id = current_setting('app.current_user_id')::UUID);
CREATE POLICY triggers_owner ON triggers USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY scores_owner ON emotion_scores USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY clusters_owner ON pattern_clusters USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY subscriptions_owner ON subscriptions USING (user_id = current_setting('app.current_user_id')::UUID);
CREATE POLICY summaries_owner ON weekly_summaries USING (user_id = current_setting('app.current_user_id')::UUID);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER triggers_updated_at BEFORE UPDATE ON triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clusters_updated_at BEFORE UPDATE ON pattern_clusters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
