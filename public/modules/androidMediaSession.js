export function createAndroidMediaSessionController({
  plugin = globalThis.Capacitor?.Plugins?.ClaudeMedia,
  getState = () => ({}),
  controls = {},
  setTimeoutFn = (callback) => setTimeout(callback, 0),
  consoleRef = console
} = {}) {
  const available = Boolean(plugin?.update);
  let permissionRequested = false;
  let syncTimer = null;

  function normalizeState(state = {}) {
    const track = state.track || {};
    const positionSeconds = Number(state.position || 0);
    const durationSeconds = Number(state.duration || 0);
    return {
      title: String(track.title || "Claude FM"),
      artist: String(track.artist || ""),
      album: String(track.album || track.mood || ""),
      cover: String(state.cover || track.cover || ""),
      liked: Boolean(state.liked),
      playing: Boolean(state.playing),
      positionMs: Number.isFinite(positionSeconds) ? Math.max(0, Math.round(positionSeconds * 1000)) : 0,
      durationMs: Number.isFinite(durationSeconds) ? Math.max(0, Math.round(durationSeconds * 1000)) : 0
    };
  }

  function requestNotificationPermission() {
    if (!available || permissionRequested) return;
    permissionRequested = true;
    plugin.requestNotificationPermission?.().catch?.((error) => {
      consoleRef?.warn?.("ClaudeMedia notification permission failed", error);
    });
  }

  function syncAndroidMediaSession() {
    if (!available) return;
    requestNotificationPermission();
    if (syncTimer) return;
    syncTimer = setTimeoutFn(() => {
      syncTimer = null;
      plugin.update(normalizeState(getState())).catch((error) => {
        consoleRef?.warn?.("ClaudeMedia update failed", error);
      });
    }, 0);
  }

  function handleMediaAction(event = {}) {
    const action = event.action || event.type || "";
    if (action === "previous") {
      controls.previous?.();
    } else if (action === "play") {
      (controls.play || controls.playPause)?.();
    } else if (action === "pause") {
      (controls.pause || controls.playPause)?.();
    } else if (action === "playPause") {
      controls.playPause?.();
    } else if (action === "next") {
      controls.next?.();
    } else if (action === "like") {
      controls.like?.();
    }
  }

  function bindAndroidMediaSessionEvents() {
    if (!plugin?.addListener) return;
    plugin.addListener("mediaAction", handleMediaAction).catch?.((error) => {
      consoleRef?.warn?.("ClaudeMedia listener failed", error);
    });
  }

  return {
    bindAndroidMediaSessionEvents,
    requestNotificationPermission,
    syncAndroidMediaSession
  };
}
