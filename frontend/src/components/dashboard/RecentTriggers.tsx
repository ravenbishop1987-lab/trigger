// RecentTriggers.tsx
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';

const INTENSITY_BG: Record<number, string> = {};
for (let i = 1; i <= 10; i++) {
  if (i <= 3) INTENSITY_BG[i] = 'bg-success/20 text-success';
  else if (i <= 6) INTENSITY_BG[i] = 'bg-warning/20 text-warning';
  else INTENSITY_BG[i] = 'bg-danger/20 text-danger';
}

interface Trigger {
  id: string;
  title: string;
  emotion_category: string;
  intensity: number;
  occurred_at: string;
}

export function RecentTriggers({ triggers }: { triggers: Trigger[] }) {
  if (!triggers.length) {
    return <p className="text-subtle text-sm">No triggers logged yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {triggers.map((t) => (
        <div key={t.id} className="flex items-start gap-3 group">
          <div className={clsx(
            'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono mt-0.5',
            INTENSITY_BG[t.intensity] || 'bg-muted text-white'
          )}>
            {t.intensity}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{t.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-subtle capitalize">{t.emotion_category}</span>
              <span className="text-muted">·</span>
              <span className="text-xs text-muted">
                {formatDistanceToNow(new Date(t.occurred_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RecentTriggers;
