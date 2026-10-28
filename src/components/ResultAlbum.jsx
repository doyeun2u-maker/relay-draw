import { ChevronLeft, ChevronRight, Download, Image as ImageIcon, MessageSquare, HelpCircle } from 'lucide-react';
import { downloadDataUrl } from '../lib/game';

export default function ResultAlbum({ room, chains, entries, players, me, isTeacher, onReveal }) {
  const sorted = [...chains].sort((a, b) => a.chain_index - b.chain_index);
  if (sorted.length === 0) return <div className="card text-center text-slate-500">결과를 불러오는 중…</div>;

  const idx = Math.min(Math.max(room.reveal_index ?? 0, 0), sorted.length - 1);
  const chain = sorted[idx];
  const nameOf = (pid) => players.find((p) => p.id === pid)?.name ?? '?';
  const items = entries.filter((e) => e.chain_id === chain.id).sort((a, b) => a.step_index - b.step_index);

  const canDownload = (e) => me && e.player_id === me.id && e.kind === 'drawing';

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex items-center justify-between gap-3">
        {isTeacher ? (
          <button className="btn-ghost" disabled={idx === 0} onClick={() => onReveal(idx - 1)}>
            <ChevronLeft /> 이전
          </button>
        ) : <span />}
        <div className="text-center">
          <p className="text-sm text-slate-500">
            릴레이 {idx + 1} / {sorted.length}
          </p>
          <p className="text-xl font-extrabold">{nameOf(chain.owner_player_id)}의 릴레이</p>
        </div>
        {isTeacher ? (
          <button className="btn-ghost" disabled={idx === sorted.length - 1} onClick={() => onReveal(idx + 1)}>
            다음 <ChevronRight />
          </button>
        ) : <span />}
      </div>

      {chain.start_prompt && (
        <div className="card border-amber-300 bg-amber-50">
          <p className="text-sm text-amber-700 font-semibold">선생님 제시어</p>
          <p className="text-2xl font-extrabold">{chain.start_prompt}</p>
        </div>
      )}

      {items.length === 0 && <div className="card text-center text-slate-400">제출된 내용이 없어요.</div>}

      {items.map((e) => (
        <div key={e.id} className="card">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            {e.kind === 'drawing' ? <ImageIcon size={16} /> : e.kind === 'word' ? <MessageSquare size={16} /> : <HelpCircle size={16} />}
            <span className="font-semibold text-slate-700">{nameOf(e.player_id)}</span>
            <span>· {e.step_index + 1}단계 · {e.kind === 'drawing' ? '그림' : e.kind === 'word' ? '제시어' : '추측'}</span>
            {canDownload(e) && (
              <button
                className="ml-auto btn-ghost py-1 px-3 text-sm"
                onClick={() => downloadDataUrl(e.content, `${nameOf(e.player_id)}_릴레이${chain.chain_index + 1}_${e.step_index + 1}단계.png`)}
              >
                <Download size={16} /> 내 그림 저장
              </button>
            )}
          </div>
          {e.kind === 'drawing' ? (
            <img
              src={e.content}
              alt="그림"
              className="w-full rounded-xl border border-slate-200 bg-white"
              onContextMenu={(ev) => { if (!canDownload(e)) ev.preventDefault(); }}
              draggable={false}
            />
          ) : (
            <p className="text-2xl font-bold">{e.content}</p>
          )}
        </div>
      ))}

      {!isTeacher && (
        <p className="text-center text-sm text-slate-400">선생님이 넘기는 화면을 함께 보고 있어요.</p>
      )}
    </div>
  );
}
