import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, SkipForward, RotateCcw, Trash2, Home, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';
import { serverNow } from '../lib/clock';
import { GRACE_MS, getDeadline, getStepDuration, getStepKind, STEP_LABEL } from '../lib/game';
import Timer from '../components/Timer.jsx';
import PlayerList from '../components/PlayerList.jsx';
import ResultAlbum from '../components/ResultAlbum.jsx';

const TEACHER_KEY = 'relay_teacher_session';

function loadSession() {
  try { return JSON.parse(localStorage.getItem(TEACHER_KEY)) || null; } catch { return null; }
}

export default function TeacherPage() {
  const [session, setSession] = useState(loadSession);
  const { room, players, chains, entries, loading, notFound } = useRoom(session?.roomId);

  // 방 생성 폼
  const [code, setCode] = useState('');
  const [mode, setMode] = useState('basic');
  const [promptsText, setPromptsText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (notFound) {
      localStorage.removeItem(TEACHER_KEY);
      setSession(null);
    }
  }, [notFound]);

  // ---- 호스트 역할: 타이머 종료 또는 전원 제출 시 다음 단계로 ----
  const submittedCount = room ? entries.filter((e) => e.step_index === room.current_step).length : 0;
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    const step = room.current_step;
    if (players.length > 0 && submittedCount >= players.length) {
      const t = setTimeout(() => advance(step), 1200);
      return () => clearTimeout(t);
    }
    const deadline = getDeadline(room);
    if (!deadline) return;
    const ms = Math.max(0, deadline + GRACE_MS - serverNow());
    const t = setTimeout(() => advance(step), ms);
    return () => clearTimeout(t);
  }, [room?.status, room?.current_step, room?.step_started_at, submittedCount, players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function advance(expectedStep) {
    if (!room) return;
    const { error: err } = await supabase.rpc('advance_step', { p_room_id: room.id, p_expected_step: expectedStep });
    if (err) console.error(err);
  }

  async function createRoom(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(code)) return setError('학급 접속 코드는 숫자 4자리여야 합니다.');
    const prompts = promptsText.split(/\n|,/).map((s) => s.trim()).filter(Boolean);
    if (mode === 'subject' && prompts.length === 0) return setError('교과 모드는 제시어를 1개 이상 입력해야 합니다.');

    setBusy(true);
    const { data, error: err } = await supabase
      .from('rooms')
      .insert({ code, mode, subject_prompts: prompts })
      .select()
      .single();
    setBusy(false);

    if (err) {
      if (err.code === '23505') setError('이미 사용 중인 코드입니다. 다른 코드를 입력하세요.');
      else setError(err.message);
      return;
    }
    const s = { roomId: data.id, hostToken: data.host_token };
    localStorage.setItem(TEACHER_KEY, JSON.stringify(s));
    setSession(s);
  }

  async function startGame() {
    if (!room) return;
    if (players.length < 2) return alert('최소 2명의 학생이 필요합니다.');
    setBusy(true);
    const { error: err } = await supabase.rpc('start_game', { p_room_id: room.id });
    setBusy(false);
    if (err) alert(err.message);
  }

  async function kick(p) {
    if (!window.confirm(`${p.name} 학생을 내보낼까요?`)) return;
    await supabase.from('players').delete().eq('id', p.id);
  }

  async function closeRoom() {
    if (!room) return;
    if (!window.confirm('방을 삭제할까요? 모든 기록이 지워집니다.')) return;
    await supabase.from('rooms').delete().eq('id', room.id);
    localStorage.removeItem(TEACHER_KEY);
    setSession(null);
  }

  function newGame() {
    localStorage.removeItem(TEACHER_KEY);
    setSession(null);
  }

  async function reveal(i) {
    if (!room) return;
    await supabase.from('rooms').update({ reveal_index: i }).eq('id', room.id);
  }

  // ---------------- 렌더 ----------------
  if (!session) {
    return (
      <main className="min-h-screen p-6 max-w-lg mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">선생님 · 방 만들기</h1>
          <Link to="/" className="btn-ghost py-2"><Home size={18} /></Link>
        </header>
        <form onSubmit={createRoom} className="card flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">학급 접속 코드 (숫자 4자리)</span>
            <input className="input tracking-[0.5em] text-center text-2xl font-mono" inputMode="numeric" maxLength={4}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="1234" />
          </label>

          <div className="flex flex-col gap-2">
            <span className="font-semibold">게임 모드</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode('basic')}
                className={`rounded-xl border p-3 text-left ${mode === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <p className="font-bold">기본 모드</p>
                <p className="text-xs text-slate-500">학생이 제시어 작성 → 그림 → 맞히기 반복</p>
              </button>
              <button type="button" onClick={() => setMode('subject')}
                className={`rounded-xl border p-3 text-left ${mode === 'subject' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <p className="font-bold">교과 모드</p>
                <p className="text-xs text-slate-500">선생님 제시어로 바로 그림 → 맞히기 반복</p>
              </button>
            </div>
          </div>

          {mode === 'subject' && (
            <label className="flex flex-col gap-1">
              <span className="font-semibold">단원/과목 제시어 (줄바꿈 또는 쉼표로 구분)</span>
              <textarea className="input min-h-[120px]" value={promptsText} onChange={(e) => setPromptsText(e.target.value)}
                placeholder={'광합성\n증산작용\n먹이그물'} />
              <span className="text-xs text-slate-500">학생 수보다 적으면 순서대로 반복 배정됩니다.</span>
            </label>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary text-lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Play />} 방 만들기
          </button>
        </form>
        <p className="text-xs text-slate-400">진행 중에는 이 화면(교사 기기)을 계속 열어 두세요. 타이머와 단계 전환을 이 화면이 관리합니다.</p>
      </main>
    );
  }

  if (loading || !room) {
    return <main className="min-h-screen flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2" /> 불러오는 중…</main>;
  }

  if (room.status === 'waiting') {
    return (
      <main className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">대기실</h1>
          <button onClick={closeRoom} className="btn-ghost py-2 text-red-600"><Trash2 size={18} /> 방 삭제</button>
        </header>
        <div className="card text-center">
          <p className="text-slate-500">학급 접속 코드</p>
          <p className="text-7xl font-black tracking-[0.3em] font-mono text-blue-700">{room.code}</p>
          <p className="text-slate-500 mt-2">{room.mode === 'basic' ? '기본 모드' : `교과 모드 · 제시어 ${room.subject_prompts.length}개`}</p>
        </div>
        <div className="card">
          <h2 className="font-bold mb-3">참여 학생 ({players.length}명)</h2>
          <PlayerList players={players} onKick={kick} />
        </div>
        <button className="btn-primary text-xl py-4" onClick={startGame} disabled={busy || players.length < 2}>
          <Play /> 게임 시작 {players.length < 2 && '(2명 이상 필요)'}
        </button>
      </main>
    );
  }

  if (room.status === 'playing') {
    const kind = getStepKind(room.mode, room.current_step);
    const submittedIds = new Set(entries.filter((e) => e.step_index === room.current_step).map((e) => e.player_id));
    return (
      <main className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">진행 중 · 코드 {room.code}</h1>
          <span className="text-slate-500">{room.current_step + 1} / {room.total_steps} 단계</span>
        </header>
        <div className="card flex flex-col gap-3">
          <p className="text-3xl font-extrabold text-blue-700">{STEP_LABEL[kind]}</p>
          <Timer deadline={getDeadline(room)} total={getStepDuration(room.mode, room.current_step)} />
          <p className="text-slate-500">제출 {submittedIds.size} / {players.length}</p>
        </div>
        <div className="card">
          <h2 className="font-bold mb-3">학생 제출 현황</h2>
          <PlayerList players={players} submittedIds={submittedIds} />
        </div>
        <button className="btn-ghost" onClick={() => advance(room.current_step)}>
          <SkipForward /> 지금 다음 단계로
        </button>
      </main>
    );
  }

  // finished
  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">결과 앨범</h1>
        <button onClick={newGame} className="btn-ghost py-2"><RotateCcw size={18} /> 새 게임</button>
      </header>
      <ResultAlbum room={room} chains={chains} entries={entries} players={players} isTeacher onReveal={reveal} />
    </main>
  );
}
