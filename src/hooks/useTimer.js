import { useEffect, useState } from 'react';
import { serverNow } from '../lib/clock';

function calc(deadline) {
	if (!deadline) return 0;
	return Math.max(0, Math.ceil((deadline - serverNow()) / 1000));
}

/** 마감 시각까지 남은 초를 250ms마다 갱신 */
export function useTimer(deadline) {
	const [remaining, setRemaining] = useState(() => calc(deadline));
	useEffect(() => {
		setRemaining(calc(deadline));
		if (!deadline) return;
		const id = setInterval(() => setRemaining(calc(deadline)), 250);
		return () => clearInterval(id);
	}, [deadline]);
	return remaining;
}
