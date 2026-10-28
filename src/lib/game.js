// 단계별 고정 시간(초)
export const DURATIONS = { word: 30, guess: 30, drawing: 60 };
// 타이머 종료 후 제출이 도착할 때까지 기다리는 유예(ms)
export const GRACE_MS = 2000;

export const STEP_LABEL = {
  word: '제시어 쓰기',
  drawing: '그림 그리기',
  guess: '그림 보고 맞히기',
};

/** 단계 번호(0부터)에 해당하는 활동 종류 */
export function getStepKind(mode, step) {
  if (mode === 'subject') return step % 2 === 0 ? 'drawing' : 'guess';
  if (step === 0) return 'word';
  return step % 2 === 1 ? 'drawing' : 'guess';
}

export function getStepDuration(mode, step) {
  return DURATIONS[getStepKind(mode, step)];
}

/** step 단계에서 playerIndex 번 학생이 담당하는 체인 번호 */
export function getChainIndexForPlayer(playerIndex, step, n) {
  return (((playerIndex - step) % n) + n) % n;
}

/** step 단계에서 chainIndex 번 체인을 담당하는 학생 번호 */
export function getPlayerIndexForChain(chainIndex, step, n) {
  return (chainIndex + step) % n;
}

/** 현재 단계 마감 시각(ms, 서버 기준) */
export function getDeadline(room) {
  if (!room?.step_started_at) return null;
  return new Date(room.step_started_at).getTime() + getStepDuration(room.mode, room.current_step) * 1000;
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
