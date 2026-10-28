import { Clock } from 'lucide-react';
import { useTimer } from '../hooks/useTimer';

export default function Timer({ deadline, total }) {
  const remaining = useTimer(deadline);
  const pct = total ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const urgent = remaining <= 10;
  return (
    <div className="flex items-center gap-3">
      <Clock className={urgent ? 'text-red-500' : 'text-blue-500'} size={22} />
      <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${urgent ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%`, transition: 'width 250ms linear' }}
        />
      </div>
      <span className={`font-mono text-2xl font-bold tabular-nums w-12 text-right ${urgent ? 'text-red-600' : ''}`}>
        {remaining}
      </span>
    </div>
  );
}
