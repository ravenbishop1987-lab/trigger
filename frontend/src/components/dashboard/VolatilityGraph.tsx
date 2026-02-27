import {
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';

interface ScorePoint {
  period_start: string;
  composite_score: number;
  stability_score: number;
  reactivity_index: number;
  trigger_count: number;
}

interface Props {
  data: ScorePoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-3 text-xs shadow-lg">
      <div className="font-semibold mb-2 text-white">
        {label ? format(new Date(label), 'MMM d, yyyy') : ''}
      </div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-subtle capitalize">{p.name.replace(/_/g, ' ')}</span>
          <span className="ml-auto font-mono font-medium text-white">{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function VolatilityGraph({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-subtle text-sm">
        No score history yet — log more triggers to see trends
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    date: format(new Date(d.period_start), 'MMM d'),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={formatted} margin={{ left: -10 }}>
        <defs>
          <linearGradient id="compositeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c6af7" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7c6af7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2230" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: '#8b93a8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#8b93a8', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="composite_score"
          fill="url(#compositeGrad)"
          stroke="#7c6af7"
          strokeWidth={2}
          dot={false}
        />
        <Line type="monotone" dataKey="stability_score" stroke="#4ade80" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
        <Line type="monotone" dataKey="reactivity_index" stroke="#e85d8a" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
