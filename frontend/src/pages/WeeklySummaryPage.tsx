import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { summariesApi } from '../services/api';
import { FileText, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function WeeklySummaryPage() {
  const qc = useQueryClient();

  const { data: summaries, isLoading } = useQuery({
    queryKey: ['summaries'],
    queryFn: summariesApi.list,
  });

  const genMut = useMutation({
    mutationFn: () => summariesApi.generate(0),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['summaries'] });
      toast.success('Weekly summary generated!');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Generation failed'),
  });

  const latest = summaries?.[0];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Weekly Summary</h1>
          <p className="text-subtle mt-1">AI-generated emotional intelligence insights</p>
        </div>
        <button
          onClick={() => genMut.mutate()}
          disabled={genMut.isPending}
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-glow"
        >
          <Wand2 size={15} />
          {genMut.isPending ? 'Generating...' : 'Generate This Week'}
        </button>
      </div>

      {isLoading ? (
        <div className="text-subtle">Loading summaries...</div>
      ) : latest ? (
        <div className="space-y-6">
          {/* Latest summary */}
          <div className="bg-surface border border-border rounded-2xl p-8">
            <div className="flex items-center gap-2 mb-2 text-subtle text-sm">
              <FileText size={14} />
              <span>
                Week of {format(new Date(latest.week_start), 'MMMM d')} – {format(new Date(latest.week_end), 'MMMM d, yyyy')}
              </span>
            </div>
            <p className="leading-relaxed text-sm whitespace-pre-line">{latest.summary_text}</p>
          </div>

          {/* Score snapshot */}
          {latest.score_snapshot && (
            <div className="grid grid-cols-4 gap-4">
              {['stability_score', 'reactivity_index', 'trigger_density_score', 'recovery_speed_score'].map((k) => (
                <div key={k} className="bg-surface border border-border rounded-xl p-4">
                  <div className="text-subtle text-xs mb-1 capitalize">{k.replace(/_/g, ' ')}</div>
                  <div className="font-display text-2xl font-bold">
                    {Math.round(latest.score_snapshot[k] ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Key insights */}
          {latest.key_insights?.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-display font-semibold mb-4">Key Insights</h3>
              <ul className="space-y-2">
                {latest.key_insights.map((insight: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-primary mt-0.5">◆</span>
                    <span className="text-subtle">{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {latest.regulation_recommendations?.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-display font-semibold mb-4">Recommended Actions</h3>
              <div className="space-y-3">
                {latest.regulation_recommendations.map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm">
                    <span className="text-primary font-bold">{i + 1}</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Past summaries */}
          {summaries.length > 1 && (
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-display font-semibold mb-4">Past Summaries</h3>
              <div className="space-y-2">
                {summaries.slice(1).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-subtle">
                      {format(new Date(s.week_start), 'MMM d')} – {format(new Date(s.week_end), 'MMM d, yyyy')}
                    </span>
                    {s.score_snapshot?.composite_score && (
                      <span className="font-mono text-sm font-medium">
                        {Math.round(s.score_snapshot.composite_score)} / 100
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20">
          <FileText size={48} className="text-muted mx-auto mb-4" />
          <p className="text-subtle mb-6">No summaries yet. Generate your first weekly summary.</p>
          <button
            onClick={() => genMut.mutate()}
            disabled={genMut.isPending}
            className="bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          >
            Generate Summary
          </button>
        </div>
      )}
    </div>
  );
}
