import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, LogOut, Home, Loader2, Images, UserRound, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoom } from '../hooks/useRoom';
import { serverNow } from '../lib/clock';
import { GRACE_MS, getDeadline, downloadDataUrl } from '../lib/game';
import PlayerList from '../components/PlayerList.jsx';
import StudentTurn from '../components/StudentTurn.jsx';
import ResultAlbum from '../components/ResultAlbum.jsx';

const STUDENT_KEY = 'relay_student_session';

function loadSession() {
  try { return JSON.parse(localStorage.getItem(STUDENT_KEY)) || null; } catch { return null; }
}

export default function StudentPage() {
  const [session, setSession] = useState(loadSession);
  const { room, players, chains, entries, loading, notFound } = useRoom(session?.roomId);
  const me = players.find((p) => p.id === session?.playerId) || null;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('album'); // 결과 화면 탭

  // 방이 삭제되었거나 내보내진 경우 세션 정리
  useEffect(() => {
    if (notFound) leave(false);
  }, [notFound]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (session && !loading && room && players.length > 0 && !me) {
      alert('선생님이 방에서 내보냈어요.');
      leave(false);
    }
  }, [loading, room, players, me, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // 안전장치: 교사 화면이 꺼져 있어도 마감 + 5초 뒤 학생 기기가 다음 단계로 넘김
  useEffect(() => {
    if (!room || room.status !== 'playing') return;
    const deadline = getDeadline(room);
    if (!deadline) return;
    const step = room.current_step;
    const ms = Math.max(0, deadline + GRACE_MS + 3000 - serverNow());
    const t = setTimeout(() => supabase.rpc('advance_step', { p_room_id: room.id, p_expected_step: step }), ms);
    return () => clearTimeout(t);
  }, [room?.status, room?.current_step, room?.step_started_at]); // eslint-disable-line react-hooks/exhaustive-deps

  async function join(e) {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(code)) return setError('학급 접속 코드는 숫자 4자리입니다.');
    if (!name.trim()) return setError('이름을 입력해 주세요.');

    setBusy(true);
    const { data: rooms } = await supabase
      .from('rooms').select('*').eq('code', code).neq('status', 'finished')
      .order('created_at', { ascending: false }).limit(1);
    const r = rooms?.[0];
    if (!r) { setBusy(false); return setError('해당 코드의 방이 없어요. 코드를 다시 확인해 주세요.'); }
    if (r.status !== 'waiting') { setBusy(false); return setError('이미 시작된 게임이에요. 다음 게임에 참여해 주세요.'); }

    const { data: p, error: err } = await supabase
      .from('players').insert({ room_id: r.id, name: name.trim().slice(0, 12) }).select().single();
    setBusy(false);
    if (err) return setError(err.message);

    const s = { roomId: r.id, playerId: p.id };
    localStorage.setItem(STUDENT_KEY, JSON.stringify(s));
    setSession(s);
  }

  async function leave(deletePlayer = true) {
    if (deletePlayer && session && room?.status === 'waiting') {
      await supabase.from('players').delete().eq('id', session.playerId);
    }
    localStorage.removeItem(STUDENT_KEY);
    setSession(null);
  }

  // ---------------- 렌더 ----------------
  if (!session) {
    return (
      <main className="min-h-screen p-6 max-w-md mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">학생 입장</h1>
          <Link to="/" className="btn-ghost py-2"><Home size={18} /></Link>
        </header>
        <form onSubmit={join} className="card flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-semibold">학급 접속 코드</span>
            <input className="input tracking-[0.5em] text-center text-2xl font-mono" inputMode="numeric" maxLength={4}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="1234" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">이름</span>
            <input className="input" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} placeholder="이름을 써 주세요" />
          </label>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="btn-primary text-lg" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <LogIn />} 입장하기
          </button>
        </form>
      </main>
    );
  }

  if (loading || !room || !me) {
    return <main className="min-h-screen flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2" /> 불러오는 중…</main>;
  }

  if (room.status === 'waiting') {
    return (
      <main className="min-h-screen p-6 max-w-2xl mx-auto flex flex-col gap-5">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">대기실</h1>
          <button onClick={() => leave(true)} className="btn-ghost py-2"><LogOut size={18} /> 나가기</button>
        </header>
        <div className="card text-center">
          <p className="text-lg"><span className="font-bold text-blue-700">{me.name}</span> 님, 환영해요!</p>
          <p className="text-slate-500 mt-1">선생님이 게임을 시작하면 자동으로 화면이 바뀌어요.</p>
        </div>
        <div className="card">
          <h2 className="font-bold mb-3">함께하는 친구들 ({players.length}명)</h2>
          <PlayerList players={players} highlightId={me.id} />
        </div>
      </main>
    );
  }

  if (room.status === 'playing') {
    return (
      <main className="min-h-screen p-4 max-w-3xl mx-auto flex flex-col gap-4">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">{me.name}</h1>
          <span className="text-slate-500 text-sm">코드 {room.code}</span>
        </header>
        <StudentTurn room={room} players={players} chains={chains} entries={entries} me={me} />
      </main>
    );
  }

  // finished
  const myDrawings = entries.filter((e) => e.player_id === me.id && e.kind === 'drawing');
  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">결과 앨범</h1>
        <button onClick={() => leave(false)} className="btn-ghost py-2"><LogOut size={18} /> 나가기</button>
      </header>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setTab('album')} className={tab === 'album' ? 'btn-primary' : 'btn-ghost'}><Images size={18} /> 함께 보기</button>
        <button onClick={() => setTab('mine')} className={tab === 'mine' ? 'btn-primary' : 'btn-ghost'}><UserRound size={18} /> 내 그림 ({myDrawings.length})</button>
      </div>

      {tab === 'album' ? (
        <ResultAlbum room={room} chains={chains} entries={entries} players={players} me={me} isTeacher={false} />
      ) : (
        <div className="flex flex-col gap-4">
          {myDrawings.length === 0 && <div className="card text-center text-slate-400">내가 그린 그림이 없어요.</div>}
          {myDrawings.map((e) => {
            const chain = chains.find((c) => c.id === e.chain_id);
            return (
              <div key={e.id} className="card">
                <div className="flex items-center justify-between mb-2 text-sm text-slate-500">
                  <span>릴레이 {(chain?.chain_index ?? 0) + 1} · {e.step_index + 1}단계</span>
                  <button className="btn-ghost py-1 px-3 text-sm"
                    onClick={() => downloadDataUrl(e.content, `${me.name}_릴레이${(chain?.chain_index ?? 0) + 1}_${e.step_index + 1}단계.png`)}>
                    <Download size={16} /> PNG 저장
                  </button>
                </div>
                <img src={e.content} alt="내 그림" className="w-full rounded-xl border border-slate-200 bg-white" />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
