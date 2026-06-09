import {
  buildSeekRequestState,
  clampSeekTarget,
  shouldClearPendingSeek
} from "./audioController.js";
import { syncProgressView } from "./playerView.js";

export function createPlaybackProgressRuntimeController({
  elements = {},
  audio,
  getPlayableDuration = () => 0,
  formatTime = (value) => String(value),
  haveMetadata = 1,
  nowFn = Date.now
} = {}) {
  let pendingSeekTime = 0;
  let pendingUserSeekTime = null;
  let pendingUserSeekUntil = 0;
  let suppressProgressSyncUntil = 0;

  function getNow() {
    return Number(nowFn()) || 0;
  }

  function getPendingSeekState() {
    return {
      pendingSeekTime,
      pendingUserSeekTime,
      pendingUserSeekUntil,
      suppressProgressSyncUntil
    };
  }

  function updateProgressUi(currentTime = audio?.currentTime || 0, durationValue = getPlayableDuration()) {
    const viewState = syncProgressView({
      progressInput: elements.progress,
      progressFill: elements.progressFill,
      walker: elements.clawdWalker,
      elapsedLabel: elements.elapsed,
      durationLabel: elements.duration
    }, { currentTime, durationValue, formatTime });
    syncProgressView({
      progressInput: elements.playerProgress,
      progressFill: elements.playerProgressFill,
      elapsedLabel: elements.playerElapsed,
      durationLabel: elements.playerDuration
    }, { currentTime, durationValue, formatTime });
    return viewState;
  }

  function canSeekAudio() {
    return Boolean(
      audio
        && audio.readyState >= haveMetadata
        && Number.isFinite(audio.duration)
        && audio.duration > 0
    );
  }

  function tryApplyPendingSeek() {
    const target = pendingUserSeekTime ?? pendingSeekTime;
    if (!target || target <= 0 || !canSeekAudio()) return false;
    const durationValue = getPlayableDuration();
    const clamped = clampSeekTarget(target, durationValue);
    try {
      audio.currentTime = clamped;
      if (pendingUserSeekTime != null && shouldClearPendingSeek(audio.currentTime || 0, clamped)) {
        pendingUserSeekTime = null;
        pendingUserSeekUntil = 0;
      }
      pendingSeekTime = 0;
      updateProgressUi(clamped, durationValue);
      return true;
    } catch {
      return false;
    }
  }

  function requestAudioSeek(targetTime, { user = false } = {}) {
    const durationValue = getPlayableDuration();
    const seekState = buildSeekRequestState(targetTime, durationValue, { user, now: getNow() });
    const { safeTarget } = seekState;
    if (user) {
      pendingUserSeekTime = seekState.pendingUserSeekTime;
      pendingUserSeekUntil = seekState.pendingUserSeekUntil;
      suppressProgressSyncUntil = seekState.suppressProgressSyncUntil;
    } else {
      pendingSeekTime = seekState.pendingSeekTime;
    }
    updateProgressUi(safeTarget, durationValue);
    tryApplyPendingSeek();
  }

  function syncPlayerProgress() {
    if (!elements.playerProgress || !elements.playerProgressFill) return;
    if (pendingUserSeekTime != null && getNow() < pendingUserSeekUntil) {
      updateProgressUi(pendingUserSeekTime, getPlayableDuration());
      return;
    }
    if (pendingUserSeekTime != null) {
      pendingUserSeekTime = null;
      pendingUserSeekUntil = 0;
    }
    updateProgressUi(audio?.currentTime || 0, getPlayableDuration());
  }

  function setProgress(percent) {
    const clamped = Math.max(0, Math.min(100, Number(percent || 0)));
    syncProgressView({
      progressFill: elements.progressFill,
      walker: elements.clawdWalker
    }, { currentTime: clamped, durationValue: 100, formatTime });
    syncProgressView({
      progressFill: elements.playerProgressFill
    }, { currentTime: clamped, durationValue: 100, formatTime });
  }

  function resetPendingSeek({ includeUser = false, includeSuppress = includeUser } = {}) {
    pendingSeekTime = 0;
    if (includeUser) {
      pendingUserSeekTime = null;
      pendingUserSeekUntil = 0;
    }
    if (includeSuppress) {
      suppressProgressSyncUntil = 0;
    }
  }

  return {
    canSeekAudio,
    getPendingSeekState,
    requestAudioSeek,
    resetPendingSeek,
    setProgress,
    syncPlayerProgress,
    tryApplyPendingSeek,
    updateProgressUi
  };
}
