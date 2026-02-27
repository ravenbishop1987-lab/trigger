// TopCategories.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const EMOTION_COLORS: Record<string, string> = {
  anger: '#f87171',
  fear: '#a78bfa',
  sadness: '#60a5fa',
  joy: '#fbbf24',
  anxiety: '#fb923c',
  shame: '#e879f9',
  grief: '#94a3b8',
  frustration: '#f97316',
  overwhelm: '#c084fc',
  disgust: '#84cc16',
  surprise: '#22d3ee',
  calm: '#4ade80',
  other: '#6b7280',
};

interface Trigger { emotion_category: string }

export function TopCategories({ triggers }: { triggers: Trigger[] }) {
  const counts = triggers.reduce<Record<string, number>>((acc, t) => {
    acc[t.emotion_category] = (acc[t.emotion_category] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  if (!data.length) {
    return <div className="h-40 flex items-center justify-center text-subtle text-sm">No data yet</div>;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
            {data.map((d) => (
              <Cell key={d.name} fill={EMOTION_COLORS[d.name] || '#6b7280'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#191c24', border: '1px solid #1e2230', borderRadius: 12, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: EMOTION_COLORS[d.name] }} />
            <span className="capitalize flex-1 text-subtle">{d.name}</span>
            <span className="font-mono font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopCategories;
