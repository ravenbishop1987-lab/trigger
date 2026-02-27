// TriggerHeatmap.tsx
import clsx from 'clsx';
import { format, eachDayOfInterval, subDays } from 'date-fns';

interface HeatDay {
  date: string;
  avg_intensity: number;
  count: number;
}

function getColor(intensity: number, count: number) {
  if (!count) return 'bg-midnight border-border';
  if (intensity >= 8) return 'bg-danger/70';
  if (intensity >= 6) return 'bg-warning/60';
  if (intensity >= 4) return 'bg-primary/50';
  return 'bg-success/40';
}

export function TriggerHeatmap({ data }: { data: HeatDay[] }) {
  const today = new Date();
  const start = subDays(today, 89);
  const days = eachDayOfInterval({ start, end: today });

  const byDate = data.reduce<Record<string, HeatDay>>((acc, d) => {
    acc[d.date] = d;
    return acc;
  }, {});

  // Build 13 weeks × 7 days grid
  const weeks: Date[][] = [];
  let week: Date[] = [];
  days.forEach((d) => {
    if (week.length === 7) { weeks.push(week); week = []; }
    week.push(d);
  });
  if (week.length) weeks.push(week);

  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {weeks.map((w, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {w.map((d) => {
              const key = format(d, 'yyyy-MM-dd');
              const info = byDate[key];
              return (
                <div
                  key={key}
                  title={info ? `${key}: avg ${info.avg_intensity?.toFixed(1)} | ${info.count} entries` : key}
                  className={clsx(
                    'w-3.5 h-3.5 rounded-sm border border-border/50 transition-opacity hover:opacity-80 cursor-default',
                    getColor(info?.avg_intensity || 0, info?.count || 0)
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-xs text-subtle">
        <span>Low</span>
        <div className="flex gap-1">
          {['bg-midnight border-border', 'bg-success/40', 'bg-primary/50', 'bg-warning/60', 'bg-danger/70'].map((c, i) => (
            <div key={i} className={clsx('w-3 h-3 rounded-sm border border-border/50', c)} />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}

export default TriggerHeatmap;
