export function clampSeekTarget(targetTime, durationValue) {
  const safeTarget = Number(targetTime || 0);
  const safeDuration = Number(durationValue || 0);
  return safeDuration
    ? Math.min(Math.max(0, safeTarget), Math.max(0, safeDuration - 0.2))
    : Math.max(0, safeTarget);
}

export function buildSeekRequestState(targetTime, durationValue, { user = false, now = Date.now() } = {}) {
  const safeTarget = clampSeekTarget(targetTime, durationValue);
  if (user) {
    return {
      safeTarget,
      pendingSeekTime: 0,
      pendingUserSeekTime: safeTarget,
      pendingUserSeekUntil: now + 12000,
      suppressProgressSyncUntil: now + 900
    };
  }
  return {
    safeTarget,
    pendingSeekTime: safeTarget,
    pendingUserSeekTime: null,
    pendingUserSeekUntil: 0,
    suppressProgressSyncUntil: 0
  };
}

export function shouldClearPendingSeek(actualTime, targetTime, tolerance = 1.25) {
  return Math.abs(Number(actualTime || 0) - Number(targetTime || 0)) < tolerance;
}
