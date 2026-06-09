import { isLocalAppRuntime } from "../runtime/platform.js";

export function readStoredPlaybackPayload(readStorage = (key) => globalThis.window?.localStorage?.getItem(key) || "") {
  try {
    const raw = readStorage("claudio-playback-payload");
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.track?.id) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getPlaybackPlaylist({ activePlaylist, model }) {
  if (activePlaylist?.sourceId) {
    return {
      id: activePlaylist.id || "",
      source: activePlaylist.source || "netease",
      sourceId: activePlaylist.sourceId || "",
      title: activePlaylist.title || "",
      subtitle: activePlaylist.subtitle || "",
      description: activePlaylist.description || "",
      cover: activePlaylist.cover || "",
      trackCount: activePlaylist.trackCount || activePlaylist.tracks?.length || 0
    };
  }
  const savedPlaylist = model?.state?.playback?.playlist;
  if (savedPlaylist?.sourceId) {
    return {
      id: savedPlaylist.id || "",
      source: savedPlaylist.source || "netease",
      sourceId: savedPlaylist.sourceId || "",
      title: savedPlaylist.title || "",
      subtitle: savedPlaylist.subtitle || "",
      description: savedPlaylist.description || "",
      cover: savedPlaylist.cover || "",
      trackCount: savedPlaylist.trackCount || model?.queue?.length || 0
    };
  }
  return null;
}

export function buildNowPayloadFromPlaybackPayload(payload, fallback = {}) {
  if (!payload?.track?.id) return null;
  const playlist = payload.playlist || null;
  const queue = Array.isArray(payload.queue) ? payload.queue : [payload.track];
  return {
    ...fallback,
    state: {
      ...(fallback.state || {}),
      playback: {
        ...(fallback.state?.playback || {}),
        source: payload.track.source || playlist?.source || "netease",
        trackId: payload.track.id || "",
        sourceTrackId: payload.track.sourceId || "",
        playlistId: playlist?.id || "",
        playlistSourceId: playlist?.sourceId || "",
        playlist,
        position: 0,
        duration: Number(payload.duration || 0),
        isPlaying: false
      },
      position: 0,
      isPlaying: false
    },
    track: payload.track,
    queue,
    weather: fallback.weather || {},
    schedule: fallback.schedule || [],
    djLine: fallback.djLine || ""
  };
}

export function buildPlaybackPayload({
  model,
  activePlaylist,
  audio,
  duration,
  pendingUserSeekTime = null,
  pendingUserSeekUntil = 0,
  pendingSeekTime = 0,
  clockOverrideTime = null,
  now = Date.now()
}) {
  if (!model?.track?.id) return null;
  const queue = Array.isArray(model.queue) ? model.queue : [];
  const overridePosition = Number.isFinite(clockOverrideTime) ? clockOverrideTime : null;
  const position = pendingUserSeekTime != null && now < pendingUserSeekUntil
    ? pendingUserSeekTime
    : (overridePosition ?? (pendingSeekTime > 0 ? pendingSeekTime : Number(audio.currentTime || model.state?.position || 0)));
  return {
    track: model.track,
    playlist: getPlaybackPlaylist({ activePlaylist, model }),
    queue,
    position: Math.max(0, position),
    duration: Math.max(0, Number(duration || 0)),
    isPlaying: !audio.paused
  };
}

export function createPlaybackPersistence({
  api,
  getPayload,
  getRemoteCapabilityBaseUrl,
  isLocalPlaybackRuntime = isLocalAppRuntime,
  writeStorage = (key, value) => globalThis.window?.localStorage?.setItem(key, value),
  navigatorRef = navigator,
  windowRef = window
}) {
  let saveTimer = null;
  let lastSnapshot = "";
  let lastPersistAt = 0;

  function getSnapshot(payload) {
    return JSON.stringify({
      trackId: payload.track.id,
      playlistId: payload.playlist?.id || "",
      playlistSourceId: payload.playlist?.sourceId || "",
      queueSize: payload.queue?.length || 0,
      position: Math.floor(payload.position),
      isPlaying: payload.isPlaying
    });
  }

  function persist({ immediate = false } = {}) {
    const payload = getPayload();
    if (!payload) return;
    const snapshot = getSnapshot(payload);
    if (!immediate && snapshot === lastSnapshot) return;
    lastSnapshot = snapshot;
    windowRef.clearTimeout(saveTimer);

    const send = () => {
      const body = JSON.stringify(payload);
      if (isLocalPlaybackRuntime()) {
        writeStorage("claudio-playback-payload", body);
      }
      if (immediate && !getRemoteCapabilityBaseUrl() && navigatorRef.sendBeacon) {
        navigatorRef.sendBeacon("/api/playback", new windowRef.Blob([body], { type: "application/json" }));
        return;
      }
      api("/api/playback", {
        method: "POST",
        weatherLocationQuery: false,
        body
      }).catch(() => {});
    };

    if (immediate) {
      send();
    } else {
      saveTimer = windowRef.setTimeout(send, 350);
    }
  }

  function persistIfStale(intervalMs = 5000, now = Date.now()) {
    if (now - lastPersistAt <= intervalMs) return false;
    lastPersistAt = now;
    persist();
    return true;
  }

  async function saveState(partial) {
    if (isLocalPlaybackRuntime()) {
      writeStorage("claudio-playback-state", JSON.stringify(partial || {}));
      await api("/api/state", {
        method: "POST",
        body: JSON.stringify(partial)
      }).catch(() => {});
      return;
    }
    await api("/api/state", {
      method: "POST",
      body: JSON.stringify(partial)
    });
  }

  return {
    persist,
    persistIfStale,
    saveState
  };
}
