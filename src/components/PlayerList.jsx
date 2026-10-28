import { User, X, Check } from 'lucide-react';

export default function PlayerList({ players, submittedIds, onKick, highlightId }) {
  if (players.length === 0) {
    return <p className="text-slate-400 text-center py-6">아직 참여한 학생이 없어요.</p>;
  }
  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {players.map((p) => {
        const done = submittedIds?.has(p.id);
        return (
          <li
            key={p.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
              p.id === highlightId ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
            }`}
          >
            {submittedIds ? (
              done ? <Check size={18} className="text-green-600" /> : <span className="w-[18px] h-[18px] rounded-full border-2 border-slate-300" />
            ) : (
              <User size={18} className="text-slate-400" />
            )}
            <span className="flex-1 truncate font-medium">{p.name}</span>
            {onKick && (
              <button onClick={() => onKick(p)} className="text-slate-400 hover:text-red-500" title="내보내기">
                <X size={16} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
