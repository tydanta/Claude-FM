export const PLAY_MODES = [
  { id: "order", label: "顺序播放", icon: "/icons/order.svg" },
  { id: "loop", label: "循环播放", icon: "/icons/loop.svg" },
  { id: "single", label: "单曲循环", icon: "/icons/repeatsingle.svg" },
  { id: "random", label: "随机播放", icon: "/icons/random.svg" },
  { id: "heartbeat", label: "心动模式", icon: "/icons/heartbeat.svg" }
];

export function getValidatedPlayMode(modeId, fallback = "order") {
  return PLAY_MODES.some((mode) => mode.id === modeId) ? modeId : fallback;
}

export function cyclePlayModeId(currentModeId) {
  const currentIndex = PLAY_MODES.findIndex((mode) => mode.id === currentModeId);
  return PLAY_MODES[(currentIndex + 1 + PLAY_MODES.length) % PLAY_MODES.length].id;
}

export function getPlaylistTrackPlayMode() {
  return "loop";
}

export function isSameTrack(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  return Boolean(a.sourceId && b.sourceId && String(a.sourceId) === String(b.sourceId));
}

export function getActiveQueueIndex(queue = [], currentTrack = null, activeQueueIndex = null) {
  if (!queue.length) return -1;
  if (
    Number.isInteger(activeQueueIndex) &&
    activeQueueIndex >= 0 &&
    activeQueueIndex < queue.length &&
    isSameTrack(queue[activeQueueIndex], currentTrack)
  ) {
    return activeQueueIndex;
  }
  return queue.findIndex((track) => isSameTrack(track, currentTrack));
}

export function getCurrentIndex(queue = [], currentTrack = null, activeQueueIndex = null, state = {}) {
  const queuedIndex = getActiveQueueIndex(queue, currentTrack, activeQueueIndex);
  if (queuedIndex >= 0) return queuedIndex;
  const activeIndex = queue.findIndex((track) => isSameTrack(track, currentTrack));
  if (activeIndex >= 0) return activeIndex;
  return state?.currentIndex ?? 0;
}

export function getNextIndex(queue = [], currentTrack = null, activeQueueIndex = null, state = {}) {
  if (!queue.length) return 0;
  return (getCurrentIndex(queue, currentTrack, activeQueueIndex, state) + 1) % queue.length;
}

export function getSequentialNextIndex(queue = [], currentTrack = null, activeQueueIndex = null, state = {}) {
  if (!queue.length) return -1;
  const currentIndex = getCurrentIndex(queue, currentTrack, activeQueueIndex, state);
  return currentIndex + 1 < queue.length ? currentIndex + 1 : -1;
}

export function getNextPlaybackIndex(queue = [], currentTrack = null, activeQueueIndex = null, playMode = "order", state = {}) {
  if (!queue.length) return -1;
  if (playMode === "order") return getSequentialNextIndex(queue, currentTrack, activeQueueIndex, state);
  return getNextIndex(queue, currentTrack, activeQueueIndex, state);
}

export function getPlayableDuration(nativeDuration, trackDuration) {
  const safeNativeDuration = Number(nativeDuration || 0);
  const safeTrackDuration = Number(trackDuration || 0);
  if (Number.isFinite(safeNativeDuration) && safeNativeDuration > 0) return safeNativeDuration;
  return Number.isFinite(safeTrackDuration) && safeTrackDuration > 0 ? safeTrackDuration : 0;
}

export function getProgressPercent(currentTime, durationValue) {
  const safeCurrent = Math.max(0, Number(currentTime || 0));
  const safeDuration = Math.max(0, Number(durationValue || 0));
  return safeDuration ? Math.max(0, Math.min(100, (safeCurrent / safeDuration) * 100)) : 0;
}

export function getPlaybackEndAction(playMode, queue = [], currentTrack = null, activeQueueIndex = null, state = {}) {
  if (playMode === "single") return { action: "replay" };
  if (playMode === "order" && getSequentialNextIndex(queue, currentTrack, activeQueueIndex, state) === -1) {
    return { action: "stop" };
  }
  return {
    action: "next",
    index: getNextPlaybackIndex(queue, currentTrack, activeQueueIndex, playMode, state)
  };
}
