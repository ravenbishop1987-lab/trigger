// TriggersPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { triggersApi } from '../services/api';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const INT_COLOR = (i: number) =>
  i >= 8 ? 'text-danger bg-danger/15' : i >= 5 ? 'text-warning bg-warning/15' : 'text-success bg-success/15';

export default function TriggersPage() {
  const [emotion, setEmotion] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['triggers', emotion],
    queryFn: () => triggersApi.list({ emotion_category: emotion || undefined, limit: 50 }),
  });

  const deleteMut = useMutation({
    mutationFn: triggersApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['triggers'] }); toast.success('Deleted'); },
  });

  const regMut = useMutation({
    mutationFn: triggersApi.getRegulation,
    onSuccess: (data) => {
      const win = window.open('', '_blank');
      win?.document.write(`<pre style="font-family:sans-serif;padding:2rem;max-width:700px;margin:auto;white-space:pre-wrap">${data.regulation_script}</pre>`);
    },
  });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Triggers</h1>
          <p className="text-subtle mt-1">{data?.total || 0} entries logged</p>
        </div>
        <Link
          to="/triggers/new"
          className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-glow"
        >
          <Plus size={16} /> Log New
        </Link>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={emotion}
          onChange={(e) => setEmotion(e.target.value)}
          className="bg-surface border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-all"
        >
          <option value="">All emotions</option>
          {['anger','fear','sadness','joy','disgust','surprise','shame','anxiety','grief','frustration','overwhelm','calm','other'].map((e) => (
            <option key={e} value={e} className="capitalize">{e}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-subtle">Loading...</div>
      ) : (
        <div className="space-y-3">
          {data?.data?.map((t: any) => (
            <div key={t.id} className="bg-surface border border-border rounded-2xl p-5 hover:border-primary/30 transition-all group">
              <div className="flex items-start gap-4">
                <div className={clsx('flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-sm', INT_COLOR(t.intensity))}>
                  {t.intensity}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{t.title}</span>
                    <span className="text-xs text-subtle capitalize bg-surface-2 px-2 py-0.5 rounded-full">{t.emotion_category}</span>
                  </div>
                  {t.description && <p className="text-sm text-subtle mt-1 truncate">{t.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                    <span>{format(new Date(t.occurred_at), 'MMM d, yyyy')}</span>
                    {t.context_tags?.length > 0 && (
                      <span>{t.context_tags.slice(0,3).join(', ')}</span>
                    )}
                    {t.recovery_minutes && <span>↩ {t.recovery_minutes}m recovery</span>}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => regMut.mutate(t.id)}
                    disabled={regMut.isPending}
                    title="Generate regulation script"
                    className="p-2 rounded-lg bg-surface-2 hover:bg-primary/20 hover:text-primary transition-all"
                  >
                    <Sparkles size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this trigger?')) deleteMut.mutate(t.id); }}
                    className="p-2 rounded-lg bg-surface-2 hover:bg-danger/20 hover:text-danger transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {!data?.data?.length && (
            <div className="text-center py-16 text-subtle">
              <p className="mb-4">No triggers logged yet</p>
              <Link to="/triggers/new" className="text-primary hover:underline">Log your first trigger →</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
