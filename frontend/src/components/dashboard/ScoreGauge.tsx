import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

interface Props {
  score: number;
  label: string;
  color?: string;
}

export function ScoreGauge({ score, label, color = '#7c6af7' }: Props) {
  const data = [{ value: score, fill: color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart cx="50%" cy="50%" innerRadius="65%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" background={{ fill: '#1e2230' }} cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-black text-2xl">{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-xs text-subtle mt-1">{label}</span>
    </div>
  );
}

export default ScoreGauge;
