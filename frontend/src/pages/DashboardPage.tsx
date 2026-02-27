import { useQuery } from '@tanstack/react-query';
import { scoresApi, triggersApi, patternsApi } from '../services/api';
import ScoreGauge from '../components/dashboard/ScoreGauge';
import VolatilityGraph from '../components/dashboard/VolatilityGraph';
import TriggerHeatmap from '../components/dashboard/TriggerHeatmap';
import TopCategories from '../components/dashboard/TopCategories';
import RecentTriggers from '../components/dashboard/RecentTriggers';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

const SCORE_LABELS: Record<string, string> = {
  stability_score: 'Stability',
  reactivity_index: 'Reactivity',
  trigger_density_score: 'Density',
  recovery_speed_score: 'Recovery',
};

const TREND_ICON = {
  improving: <TrendingUp size={14} className="text-success" />,
  declining: <TrendingDown size={14} className="text-danger" />,
  stable: <Minus size={14} className="text-subtle" />,
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: scores, isLoading: loadingScores } = useQuery({
    queryKey: ['scores', 'current'],
    queryFn: scoresApi.current,
  });

  const { data: heatmap } = useQuery({
    queryKey: ['scores', 'heatmap'],
    queryFn: () => scoresApi.heatmap(90),
  });

  const { data: triggers } = useQuery({
    queryKey: ['triggers', 'recent'],
    queryFn: () => triggersApi.list({ limit: 30 }),
  });

  const { data: history } = useQuery({
    queryKey: ['scores', 'history'],
    queryFn: () => scoresApi.history(12),
  });

  const scoreKeys = ['stability_score', 'reactivity_index', 'trigger_density_score', 'recovery_speed_score'];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Good morning, <span className="text-gradient">{user?.full_name?.split(' ')[0]}</span>
          </h1>
          <p className="text-subtle mt-1">Here's your emotional intelligence snapshot</p>
        </div>
        <Link
          to="/triggers/new"
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-glow"
        >
          <Plus size={16} />
          Log Trigger
        </Link>
      </div>

      {/* Composite score + trend */}
      <div className="bg-surface-2 border border-border rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-8 relative">
          <div>
            <div className="text-subtle text-sm mb-1">Composite Score</div>
            <div className="font-display text-6xl font-black text-gradient">
              {loadingScores ? '—' : Math.round(scores?.composite_score ?? 0)}
            </div>
            <div className="text-subtle text-xs mt-1">out of 100</div>
          </div>
          <div className="flex-1 grid grid-cols-4 gap-4">
            {scoreKeys.map((k) => (
              <div key={k} className="bg-surface rounded-xl p-4 border border-border">
                <div className="text-subtle text-xs mb-1">{SCORE_LABELS[k]}</div>
                <div className="font-display text-2xl font-bold">
                  {scores ? Math.round(scores[k] ?? 0) : '—'}
                </div>
                <div className="mt-2 h-1.5 bg-midnight rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${scores?.[k] ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {scores?.volatility && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-midnight border border-border text-sm">
              {TREND_ICON[scores.volatility.trend as keyof typeof TREND_ICON]}
              <span className="capitalize text-white font-medium">{scores.volatility.trend}</span>
            </div>
          )}
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-4">Volatility Over Time</h2>
          <VolatilityGraph data={history || []} />
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-4">Top Emotion Categories</h2>
          <TopCategories triggers={triggers?.data || []} />
        </div>
      </div>

      {/* Heatmap + recent */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-4">Trigger Heatmap (90 days)</h2>
          <TriggerHeatmap data={heatmap || []} />
        </div>
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-4">Recent Triggers</h2>
          <RecentTriggers triggers={triggers?.data?.slice(0, 6) || []} />
        </div>
      </div>
    </div>
  );
}
