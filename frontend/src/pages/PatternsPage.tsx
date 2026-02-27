import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patternsApi } from '../services/api';
import { Brain, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const RISK_COLORS: Record<string, string> = {
  low: 'text-success bg-success/15 border-success/30',
  medium: 'text-warning bg-warning/15 border-warning/30',
  high: 'text-orange-400 bg-orange-400/15 border-orange-400/30',
  critical: 'text-danger bg-danger/15 border-danger/30',
};

export default function PatternsPage() {
  const qc = useQueryClient();

  const { data: clusters, isLoading } = useQuery({
    queryKey: ['patterns'],
    queryFn: patternsApi.list,
  });

  const { data: escalation } = useQuery({
    queryKey: ['escalation'],
    queryFn: patternsApi.escalation,
    retry: false,
  });

  const clusterMut = useMutation({
    mutationFn: () => patternsApi.cluster(30),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patterns'] });
      toast.success('Patterns analyzed!');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Analysis failed'),
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Pattern Intelligence</h1>
          <p className="text-subtle mt-1">AI-identified recurring emotional clusters</p>
        </div>
        <button
          onClick={() => clusterMut.mutate()}
          disabled={clusterMut.isPending}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          <RefreshCw size={15} className={clusterMut.isPending ? 'animate-spin' : ''} />
          {clusterMut.isPending ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
      </div>

      {/* Escalation alert */}
      {escalation?.escalation_detected && (
        <div className="mb-6 bg-danger/10 border border-danger/30 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle size={18} className="text-danger" />
            <span className="font-display font-semibold text-danger">Escalation Detected</span>
            <span className={clsx('text-xs px-2 py-0.5 rounded-full border uppercase font-mono', RISK_COLORS[escalation.risk_level])}>
              {escalation.risk_level}
            </span>
          </div>
          <p className="text-sm text-subtle mb-3">{escalation.pattern_description}</p>
          {escalation.recommended_actions?.length > 0 && (
            <ul className="text-sm space-y-1">
              {escalation.recommended_actions.map((a: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-subtle"><span className="text-danger mt-0.5">→</span>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-subtle">Loading patterns...</div>
      ) : clusters?.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {clusters.map((c: any) => (
            <div key={c.id} className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain size={18} className="text-primary" />
                    <h3 className="font-display font-semibold">{c.cluster_name}</h3>
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border capitalize font-mono', RISK_COLORS[c.escalation_risk])}>
                      {c.escalation_risk} risk
                    </span>
                  </div>
                  <p className="text-sm text-subtle mb-4">{c.description}</p>

                  <div className="flex items-center gap-6 text-sm mb-4">
                    <div><span className="text-subtle">Emotion: </span><span className="capitalize">{c.centroid_emotion}</span></div>
                    <div><span className="text-subtle">Avg intensity: </span><span className="font-mono">{c.avg_intensity?.toFixed(1)}/10</span></div>
                    <div><span className="text-subtle">Occurrences: </span><span className="font-mono">{c.frequency}</span></div>
                    <div><span className="text-subtle">Triggers: </span><span className="font-mono">{c.trigger_ids?.length || 0}</span></div>
                  </div>

                  {c.regulation_suggestions?.length > 0 && (
                    <div>
                      <div className="text-xs text-subtle uppercase tracking-wider mb-2">Regulation suggestions</div>
                      <div className="flex flex-wrap gap-2">
                        {c.regulation_suggestions.map((s: string, i: number) => (
                          <span key={i} className="text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Brain size={48} className="text-muted mx-auto mb-4" />
          <p className="text-subtle mb-2">No patterns detected yet</p>
          <p className="text-muted text-sm mb-6">Log at least 3 triggers then run AI analysis</p>
          <button
            onClick={() => clusterMut.mutate()}
            disabled={clusterMut.isPending}
            className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          >
            Analyze my patterns
          </button>
        </div>
      )}
    </div>
  );
}
