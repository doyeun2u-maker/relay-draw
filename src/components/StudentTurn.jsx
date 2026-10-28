import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getChainIndexForPlayer, getDeadline, getStepDuration, getStepKind, STEP_LABEL } from '../lib/game';
import { useTimer } from '../hooks/useTimer';
import Timer from './Timer.jsx';
import DrawingCanvas from './DrawingCanvas.jsx';

export default function StudentTurn({ room, players, chains, entries, me }) {
  const n = room.total_steps;
  const step = room.current_step;
  const kind = getStepKind(room.mode, step);
  const duration = getStepDuration(room.mode, step);
  const deadline = getDeadline(room);
  const remaining = useTimer(deadline);

  const chainIndex = me.order_index != null ? getChainIndexForPlayer(me.order_index, step, n) : null;
  const chain = chains.find((c) => c.chain_index === chainIndex);
  const prev = chain ? entries.find((e) => e.chain_id === chain.id && e.step_index === step - 1) : null;
  const mine = chain ? entries.find((e) => e.chain_id === chain.id && e.step_index === step) : null;

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const lockRef = useRef(false);

  // 단계가 바뀌면 입력 상태 초기화
  useEffect(() => {
    setText('');
    setSaving(false);
    setSubmitted(false);
    setError('');
    lockRef.current = false;
  }, [step]);

  const submit = useCallback(async () => {
    if (!chain || lockRef.current) return;
    lockRef.current = true;
    setSaving(true);
    setError('');

    let content;
    if (kind === 'drawing') {
      content = canvasRef.current?.toDataURL() ?? '';
    } else {
      content = text.trim() || (kind === 'word' ? '(제시어를 쓰지 못했어요)' : '(모르겠어요)');
    }

    const { error: err } = await supabase
      .from('entries')
      .upsert(
        { room_id: room.id, chain_id: chain.id, step_index: step, player_id: me.id, kind, content },
        { onConflict: 'chain_id,step_index' }
      );

    setSaving(false);
    if (err) {
      console.error(err);
      lockRef.current = false;
      setError('제출에 실패했어요. 다시 눌러 주세요.');
      return;
    }
    setSubmitted(true);
  }, [chain, kind, text, room.id, step, me.id]);

  // 시간이 끝나면 자동 제출
  useEffect(() => {
    if (deadline && remaining === 0 && !mine && !lockRef.current) submit();
  }, [remaining, deadline, mine, submit]);

  if (!chain || me.order_index == null) {
    return (
      <div className="card text-center text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" /> 준비 중이에요…
      </div>
    );
  }

  const done = submitted || !!mine;
  const promptText = kind === 'drawing' ? (step === 0 ? chain.start_prompt : prev?.content) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-500">
            {step + 1} / {n} 단계
          </span>
          <span className="font-bold text-blue-700">{STEP_LABEL[kind]}</span>
        </div>
        <Timer deadline={deadline} total={duration} />
      </div>

      {done ? (
        <div className="card text-center py-10">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-3" />
          <p className="text-xl font-bold">제출 완료!</p>
          <p className="text-slate-500 mt-1">친구들이 끝날 때까지 기다려 주세요.</p>
        </div>
      ) : (
        <>
          {kind === 'word' && (
            <div className="card flex flex-col gap-3">
              <p className="text-lg font-semibold">친구가 그릴 제시어를 써 주세요.</p>
              <input
                className="input"
                placeholder="예: 하늘을 나는 고래"
                value={text}
                maxLength={30}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
              />
            </div>
          )}

          {kind === 'guess' && (
            <div className="card flex flex-col gap-3">
              <p className="text-lg font-semibold">이 그림은 무엇일까요?</p>
              {prev?.kind === 'drawing' && prev.content ? (
                <img src={prev.content} alt="친구의 그림" className="w-full rounded-xl border border-slate-200 bg-white" />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-400">
                  앞 친구가 그림을 제출하지 못했어요. 상상해서 적어 보세요!
                </div>
              )}
              <input
                className="input"
                placeholder="정답을 적어 주세요"
                value={text}
                maxLength={30}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
              />
            </div>
          )}

          {kind === 'drawing' && (
            <div className="flex flex-col gap-3">
              <div className="card py-3">
                <p className="text-sm text-slate-500">제시어</p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {promptText || '(제시어가 없어요 — 자유롭게 그려 보세요!)'}
                </p>
              </div>
              <DrawingCanvas ref={canvasRef} disabled={saving} />
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button className="btn-primary text-lg" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : <Send size={20} />}
            제출하기
          </button>
        </>
      )}
    </div>
  );
}
