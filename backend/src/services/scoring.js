/**
 * SCORING ENGINE
 * All scores are normalized to 0–100.
 * Higher = healthier (more stable, faster recovery, lower reactivity/density)
 */

/**
 * Emotional Stability Score
 *
 * Formula:
 *   - Base: 100
 *   - Subtract: (avg_intensity / 10) * 40      → intensity penalty (0–40)
 *   - Subtract: (std_dev_intensity / 10) * 30   → variance penalty (0–30)
 *   - Subtract: (high_intensity_ratio) * 30      → proportion of entries ≥ 8/10 (0–30)
 *
 * @param {Array<{intensity: number}>} triggers
 * @returns {number} 0–100
 */
export function calcStabilityScore(triggers) {
  if (!triggers.length) return 100;

  const intensities = triggers.map((t) => t.intensity);
  const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;

  const variance = intensities.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / intensities.length;
  const stdDev = Math.sqrt(variance);

  const highCount = intensities.filter((i) => i >= 8).length;
  const highRatio = highCount / intensities.length;

  const score = 100
    - (avg / 10) * 40
    - (stdDev / 10) * 30
    - highRatio * 30;

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Reactivity Index  (lower raw = higher score)
 *
 * Formula:
 *   raw_reactivity = Σ(intensity_i * weight_i) / n
 *   where weight_i = 1 + (1 if sudden onset, i.e., no prior entry within 30 min)
 *   score = 100 - (raw_reactivity / 10) * 100
 *
 * @param {Array<{intensity: number, occurred_at: string}>} triggers
 * @returns {number} 0–100
 */
export function calcReactivityIndex(triggers) {
  if (!triggers.length) return 100;

  const sorted = [...triggers].sort(
    (a, b) => new Date(a.occurred_at) - new Date(b.occurred_at)
  );

  let weightedSum = 0;
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    // Check if previous entry was within 30 minutes (sustained vs sudden)
    const prev = sorted[i - 1];
    const minutesSincePrev = prev
      ? (new Date(t.occurred_at) - new Date(prev.occurred_at)) / 60000
      : Infinity;

    // Sudden spikes (no recent prior) get weighted more heavily
    const weight = minutesSincePrev > 30 ? 1.5 : 1.0;
    weightedSum += t.intensity * weight;
  }

  const rawReactivity = weightedSum / sorted.length;
  const score = 100 - (rawReactivity / 10) * 100;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Trigger Density Score  (fewer triggers per day = higher score)
 *
 * Formula:
 *   density = trigger_count / days_in_period
 *   score = 100 - min(density * 20, 100)
 *   (i.e., 5+ triggers/day = score 0)
 *
 * @param {number} triggerCount
 * @param {number} daysInPeriod
 * @returns {number} 0–100
 */
export function calcTriggerDensityScore(triggerCount, daysInPeriod) {
  if (!daysInPeriod || !triggerCount) return 100;
  const density = triggerCount / daysInPeriod;
  const score = 100 - Math.min(density * 20, 100);
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Recovery Speed Score
 *
 * Formula:
 *   avg_recovery_mins = mean of all recovery_minutes entries
 *   score = 100 - min((avg_recovery_mins / 120) * 100, 100)
 *   (≤0 min = 100, ≥120 min = 0)
 *
 * @param {Array<{recovery_minutes: number|null}>} triggers
 * @returns {number} 0–100
 */
export function calcRecoverySpeedScore(triggers) {
  const withRecovery = triggers.filter((t) => t.recovery_minutes != null && t.recovery_minutes >= 0);
  if (!withRecovery.length) return 50; // neutral when no data

  const avgRecovery =
    withRecovery.reduce((sum, t) => sum + t.recovery_minutes, 0) / withRecovery.length;

  const score = 100 - Math.min((avgRecovery / 120) * 100, 100);
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Composite Score — weighted average of all four scores.
 *
 * Weights:
 *   Stability:     35%
 *   Reactivity:    25%
 *   Density:       20%
 *   Recovery:      20%
 *
 * @param {{ stability, reactivity, density, recovery }} scores
 * @returns {number} 0–100
 */
export function calcCompositeScore({ stability, reactivity, density, recovery }) {
  const composite =
    stability * 0.35 +
    reactivity * 0.25 +
    density * 0.20 +
    recovery * 0.20;

  return Math.round(composite * 100) / 100;
}

/**
 * Volatility Window — detect if recent 7 days are worse than prior 7 days
 *
 * @param {Array<{intensity: number, occurred_at: string}>} triggers
 * @returns {{ trend: 'improving'|'stable'|'declining', delta: number }}
 */
export function detectVolatilityTrend(triggers) {
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  const recent = triggers.filter((t) => new Date(t.occurred_at) >= sevenDaysAgo);
  const prior = triggers.filter(
    (t) => new Date(t.occurred_at) >= fourteenDaysAgo && new Date(t.occurred_at) < sevenDaysAgo
  );

  const avgIntensity = (arr) =>
    arr.length ? arr.reduce((s, t) => s + t.intensity, 0) / arr.length : 0;

  const recentAvg = avgIntensity(recent);
  const priorAvg = avgIntensity(prior);
  const delta = recentAvg - priorAvg;

  return {
    trend: delta < -0.5 ? 'improving' : delta > 0.5 ? 'declining' : 'stable',
    delta: Math.round(delta * 100) / 100,
    recentAvg: Math.round(recentAvg * 100) / 100,
    priorAvg: Math.round(priorAvg * 100) / 100,
  };
}

/**
 * Build full score snapshot for a set of triggers within a period.
 *
 * @param {Array} triggers
 * @param {number} daysInPeriod
 * @returns {object}
 */
export function buildScoreSnapshot(triggers, daysInPeriod = 7) {
  const stability = calcStabilityScore(triggers);
  const reactivity = calcReactivityIndex(triggers);
  const density = calcTriggerDensityScore(triggers.length, daysInPeriod);
  const recovery = calcRecoverySpeedScore(triggers);
  const composite = calcCompositeScore({ stability, reactivity, density, recovery });
  const volatility = detectVolatilityTrend(triggers);

  const emotionCounts = triggers.reduce((acc, t) => {
    acc[t.emotion_category] = (acc[t.emotion_category] || 0) + 1;
    return acc;
  }, {});
  const dominant_emotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    stability_score: stability,
    reactivity_index: reactivity,
    trigger_density_score: density,
    recovery_speed_score: recovery,
    composite_score: composite,
    volatility,
    trigger_count: triggers.length,
    avg_intensity: triggers.length
      ? Math.round((triggers.reduce((s, t) => s + t.intensity, 0) / triggers.length) * 100) / 100
      : 0,
    dominant_emotion,
  };
}
