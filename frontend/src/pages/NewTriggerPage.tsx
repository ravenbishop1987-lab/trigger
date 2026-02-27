import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { triggersApi } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const EMOTIONS = [
  'anger','fear','sadness','joy','disgust','surprise',
  'shame','anxiety','grief','frustration','overwhelm','calm','other'
];

const EMOTION_COLORS: Record<string, string> = {
  anger: 'border-red-500/50 bg-red-500/10 text-red-400',
  fear: 'border-purple-400/50 bg-purple-400/10 text-purple-300',
  sadness: 'border-blue-400/50 bg-blue-400/10 text-blue-300',
  joy: 'border-yellow-400/50 bg-yellow-400/10 text-yellow-300',
  disgust: 'border-lime-500/50 bg-lime-500/10 text-lime-400',
  surprise: 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300',
  shame: 'border-fuchsia-400/50 bg-fuchsia-400/10 text-fuchsia-300',
  anxiety: 'border-orange-400/50 bg-orange-400/10 text-orange-300',
  grief: 'border-slate-400/50 bg-slate-400/10 text-slate-300',
  frustration: 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  overwhelm: 'border-purple-500/50 bg-purple-500/10 text-purple-400',
  calm: 'border-green-400/50 bg-green-400/10 text-green-300',
  other: 'border-gray-500/50 bg-gray-500/10 text-gray-400',
};

const INTENSITY_LABELS = ['', 'Barely noticeable', 'Mild', 'Low', 'Moderate', 'Notable', 'Strong', 'Intense', 'Very intense', 'Overwhelming', 'Extreme'];

const COMMON_TAGS = ['work', 'family', 'partner', 'finances', 'health', 'social', 'traffic', 'sleep', 'deadline', 'conflict', 'unexpected'];

export default function NewTriggerPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    emotion_category: 'anxiety',
    intensity: 5,
    body_sensation: '',
    context_tags: [] as string[],
    location: '',
    people_involved: [] as string[],
    thought_pattern: '',
    regulation_used: '',
    recovery_minutes: '',
  });

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      context_tags: f.context_tags.includes(tag)
        ? f.context_tags.filter((t) => t !== tag)
        : [...f.context_tags, tag],
    }));
  }

  function addTagInput() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.context_tags.includes(tag)) {
      setForm((f) => ({ ...f, context_tags: [...f.context_tags, tag] }));
    }
    setTagInput('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Please add a title');
    setLoading(true);
    try {
      await triggersApi.create({
        ...form,
        intensity: Number(form.intensity),
        recovery_minutes: form.recovery_minutes ? Number(form.recovery_minutes) : undefined,
      });
      toast.success('Trigger logged successfully');
      navigate('/triggers');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save trigger');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <button onClick={() => navigate(-1)} className="text-subtle text-sm hover:text-white mb-4 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="font-display text-2xl font-bold">Log Emotional Trigger</h1>
        <p className="text-subtle mt-1">Capture what happened and how it felt</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <label className="block font-display font-semibold mb-3">What triggered you? <span className="text-danger">*</span></label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            required
            className="w-full bg-midnight border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            placeholder="Brief description of the trigger event..."
          />
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            className="w-full mt-3 bg-midnight border border-border rounded-xl px-4 py-3 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all resize-none text-sm"
            placeholder="Optional: more detail about what happened..."
          />
        </div>

        {/* Emotion + Intensity */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <label className="block font-display font-semibold mb-3">Emotion Category</label>
          <div className="flex flex-wrap gap-2 mb-6">
            {EMOTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm((f) => ({ ...f, emotion_category: e }))}
                className={clsx(
                  'px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all',
                  form.emotion_category === e ? EMOTION_COLORS[e] : 'border-border text-subtle hover:border-muted'
                )}
              >
                {e}
              </button>
            ))}
          </div>

          <label className="block font-display font-semibold mb-3">
            Intensity: <span className="text-primary">{form.intensity}/10</span>{' '}
            <span className="text-subtle font-body font-normal text-sm">— {INTENSITY_LABELS[form.intensity]}</span>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={form.intensity}
            onChange={(e) => setForm((f) => ({ ...f, intensity: Number(e.target.value) }))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>1 — Barely noticeable</span>
            <span>10 — Extreme</span>
          </div>
        </div>

        {/* Context */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <label className="block font-display font-semibold mb-3">Context Tags</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {COMMON_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg border text-xs capitalize transition-all',
                  form.context_tags.includes(t)
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border text-subtle hover:border-muted'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTagInput())}
              className="flex-1 bg-midnight border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-all"
              placeholder="Custom tag..."
            />
            <button type="button" onClick={addTagInput} className="px-4 py-2.5 bg-surface-2 border border-border rounded-xl text-sm hover:border-primary/40 transition-all">
              Add
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-subtle mb-1.5">Location</label>
              <input
                value={form.location}
                onChange={set('location')}
                className="w-full bg-midnight border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-all"
                placeholder="Home, office, car..."
              />
            </div>
            <div>
              <label className="block text-sm text-subtle mb-1.5">Body Sensation</label>
              <input
                value={form.body_sensation}
                onChange={set('body_sensation')}
                className="w-full bg-midnight border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-all"
                placeholder="Tight chest, flushed, tense..."
              />
            </div>
          </div>
        </div>

        {/* Cognitive */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <label className="block font-display font-semibold mb-1">Thought Pattern</label>
          <p className="text-subtle text-sm mb-3">What was going through your mind?</p>
          <textarea
            value={form.thought_pattern}
            onChange={set('thought_pattern')}
            rows={2}
            className="w-full bg-midnight border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 transition-all resize-none"
            placeholder="They always do this to me / I can't handle this..."
          />
        </div>

        {/* Recovery */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <label className="block font-display font-semibold mb-3">Recovery</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-subtle mb-1.5">Regulation used</label>
              <input
                value={form.regulation_used}
                onChange={set('regulation_used')}
                className="w-full bg-midnight border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-all"
                placeholder="Breathing, walk, journaling..."
              />
            </div>
            <div>
              <label className="block text-sm text-subtle mb-1.5">Recovery time (minutes)</label>
              <input
                type="number"
                min={0}
                value={form.recovery_minutes}
                onChange={set('recovery_minutes')}
                className="w-full bg-midnight border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/60 transition-all"
                placeholder="e.g. 30"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pb-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all shadow-glow"
          >
            {loading ? 'Saving...' : 'Save Trigger'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-surface-2 border border-border rounded-xl text-sm hover:border-muted transition-all"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
