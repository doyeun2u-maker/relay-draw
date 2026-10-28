import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { syncClock } from '../lib/clock';

/**
 * 방 하나에 속한 모든 데이터를 불러오고 Realtime으로 구독합니다.
 * 변경 이벤트가 오면 해당 테이블을 다시 조회합니다(대용량 base64 payload 문제 회피).
 */
export function useRoom(roomId) {
	const [room, setRoom] = useState(null);
	const [players, setPlayers] = useState([]);
	const [chains, setChains] = useState([]);
	const [entries, setEntries] = useState([]);
	const [loading, setLoading] = useState(!!roomId);
	const [notFound, setNotFound] = useState(false);

	const loadRoom = useCallback(async () => {
		if (!roomId) return;
		const { data } = await supabase.from('rooms').select('*').eq('id', roomId).maybeSingle();
		if (!data) setNotFound(true);
		setRoom(data ?? null);
	}, [roomId]);

	const loadPlayers = useCallback(async () => {
		if (!roomId) return;
		const { data } = await supabase.from('players').select('*').eq('room_id', roomId).order('created_at');
		setPlayers(data ?? []);
	}, [roomId]);

	const loadChains = useCallback(async () => {
		if (!roomId) return;
		const { data } = await supabase.from('chains').select('*').eq('room_id', roomId).order('chain_index');
		setChains(data ?? []);
	}, [roomId]);

	const loadEntries = useCallback(async () => {
		if (!roomId) return;
		const { data } = await supabase.from('entries').select('*').eq('room_id', roomId).order('step_index');
		setEntries(data ?? []);
	}, [roomId]);

	const refresh = useCallback(async () => {
		await Promise.all([loadRoom(), loadPlayers(), loadChains(), loadEntries()]);
		setLoading(false);
	}, [loadRoom, loadPlayers, loadChains, loadEntries]);

	useEffect(() => {
		if (!roomId) {
			setRoom(null);
			setPlayers([]);
			setChains([]);
			setEntries([]);
			setLoading(false);
			return;
		}

		setLoading(true);
		setNotFound(false);
		syncClock();
		refresh();

		const channel = supabase
			.channel(`room-${roomId}`)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, loadRoom)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` }, loadPlayers)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'chains', filter: `room_id=eq.${roomId}` }, loadChains)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'entries', filter: `room_id=eq.${roomId}` }, loadEntries)
			.subscribe();

		// Realtime 누락 대비 폴링(방 상태만, 5초)
		const poll = setInterval(loadRoom, 5000);

		return () => {
			supabase.removeChannel(channel);
			clearInterval(poll);
		};
	}, [roomId, refresh, loadRoom, loadPlayers, loadChains, loadEntries]);

	// 단계/상태가 바뀌면 나머지 테이블도 한 번 더 동기화
	useEffect(() => {
		if (!room) return;
		loadPlayers();
		loadChains();
		loadEntries();
	}, [room?.status, room?.current_step]); // eslint-disable-line react-hooks/exhaustive-deps

	return { room, players, chains, entries, loading, notFound, refresh };
}
