import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-5';

// Helper — sends a message to Claude and returns the text
async function call({ system, user, maxTokens = 1024, temperature = 1 }) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return response.content[0].text;
}

// Strip markdown fences Claude occasionally wraps JSON in
function parseJSON(text) {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(clean);
}

// ── Emotion classification ────────────────────────────────
export async function classifyEmotion(text, hintCategory) {
  const result = await call({
    system: `You are a clinical emotion classification assistant.
Return ONLY a valid JSON object — no prose, no markdown:
{
  "primary_emotion": string (anger|fear|sadness|joy|disgust|surprise|shame|anxiety|grief|frustration|overwhelm|calm|other),
  "secondary_emotions": string[],
  "valence": number (-1 to 1),
  "arousal": number (0 to 1),
  "cognitive_distortions": string[],
  "confidence": number (0 to 1)
}`,
    user: `User logged emotion: ${hintCategory}\nTrigger: "${text}"`,
    maxTokens: 400,
    temperature: 0,
  });
  return parseJSON(result);
}

// ── Pattern clustering ────────────────────────────────────
export async function clusterTriggers(triggers) {
  if (!triggers.length) return [];

  const simplified = triggers.map((t) => ({
    id: t.id,
    title: t.title,
    emotion: t.emotion_category,
    intensity: t.intensity,
    tags: t.context_tags,
    thought: t.thought_pattern,
  }));

  const result = await call({
    system: `You are an emotion pattern analyst. Identify thematic clusters in the trigger data.
Return ONLY a valid JSON object — no prose, no markdown:
{
  "clusters": [{
    "name": string,
    "description": string,
    "trigger_ids": string[],
    "centroid_emotion": string,
    "avg_intensity": number,
    "escalation_risk": "low"|"medium"|"high"|"critical",
    "insights": string,
    "regulation_suggestions": string[]
  }]
}`,
    user: JSON.stringify(simplified),
    maxTokens: 2000,
    temperature: 0,
  });

  const parsed = parseJSON(result);
  return parsed.clusters || [];
}

// ── Escalation detection ──────────────────────────────────
export async function detectEscalation(recentTriggers, historicalAvg) {
  const result = await call({
    system: `You are a clinical risk assessment assistant for emotional regulation.
Return ONLY a valid JSON object — no prose, no markdown:
{
  "escalation_detected": boolean,
  "risk_level": "low"|"moderate"|"high"|"critical",
  "pattern_description": string,
  "contributing_factors": string[],
  "recommended_actions": string[]
}`,
    user: `Historical avg intensity: ${historicalAvg}
Recent triggers (last 7 days): ${JSON.stringify(recentTriggers.map((t) => ({
  emotion: t.emotion_category,
  intensity: t.intensity,
  date: t.occurred_at,
  tags: t.context_tags,
})))}`,
    maxTokens: 600,
    temperature: 0,
  });
  return parseJSON(result);
}

// ── Regulation script generator ───────────────────────────
export async function generateRegulationScript(trigger) {
  const result = await call({
    system: `You are a licensed clinical psychologist trained in CBT, DBT, and somatic regulation.
Generate a personalized, step-by-step emotional regulation script based on the trigger.
Format as a calming first-person guided script (2-4 min to read aloud).
Include: grounding technique, cognitive reframe, somatic release, affirmation.
Return only the script text — no JSON, no headers.`,
    user: `Trigger: "${trigger.title}"
Emotion: ${trigger.emotion_category}
Intensity: ${trigger.intensity}/10
Body sensation: ${trigger.body_sensation || 'not specified'}
Thought pattern: ${trigger.thought_pattern || 'not specified'}`,
    maxTokens: 1000,
    temperature: 1,
  });
  return result;
}

// ── Weekly summary generator ──────────────────────────────
export async function generateWeeklySummary(userId, scoreSnapshot, triggers) {
  const result = await call({
    system: `You are an empathetic emotional intelligence coach.
Return ONLY a valid JSON object — no prose, no markdown:
{
  "summary_text": string (2-3 paragraphs, warm and clinical),
  "key_insights": string[] (3-5 insights),
  "top_triggers": string[] (top 3 themes),
  "regulation_recommendations": string[] (3 actionable items),
  "encouragement": string (one motivating sentence)
}`,
    user: `Week scores: ${JSON.stringify(scoreSnapshot)}
Emotions this week: ${JSON.stringify(
  triggers.reduce((acc, t) => {
    acc[t.emotion_category] = (acc[t.emotion_category] || 0) + 1;
    return acc;
  }, {})
)}
Trigger titles: ${triggers.map((t) => t.title).slice(0, 15).join('; ')}`,
    maxTokens: 1500,
    temperature: 1,
  });
  return parseJSON(result);
}

// ── Trend detection ───────────────────────────────────────
export async function detectTrends(triggers) {
  const byDay = triggers.reduce((acc, t) => {
    const day = new Date(t.occurred_at).toISOString().slice(0, 10);
    if (!acc[day]) acc[day] = [];
    acc[day].push(t.intensity);
    return acc;
  }, {});

  const dailyAvg = Object.entries(byDay).map(([date, intensities]) => ({
    date,
    avg: intensities.reduce((a, b) => a + b, 0) / intensities.length,
    count: intensities.length,
  }));

  const result = await call({
    system: `Analyze emotional trigger trend data.
Return ONLY a valid JSON object — no prose, no markdown:
{
  "overall_trend": "improving"|"stable"|"worsening",
  "trend_summary": string,
  "peak_days": string[],
  "low_days": string[],
  "pattern_notes": string
}`,
    user: JSON.stringify(dailyAvg),
    maxTokens: 700,
    temperature: 0,
  });
  return parseJSON(result);
}
