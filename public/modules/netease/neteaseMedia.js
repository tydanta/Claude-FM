import { androidMediaProxyBaseUrl, isAndroidRuntime } from "../runtime/platform.js";

export { isAndroidRuntime };

const coverSizes = {
  "list-small": 140,
  list: 200,
  "grid-small": 240,
  grid: 300,
  detail: 600,
  player: 800,
  "player-large": 1000
};

const androidCoverSizes = {
  "list-small": 80,
  list: 120,
  "grid-small": 140,
  grid: 180,
  detail: 360,
  player: 520,
  "player-large": 720
};

export function getNeteaseCoverSize(target = "list") {
  const sizes = isAndroidRuntime() ? androidCoverSizes : coverSizes;
  return sizes[target] || sizes.list;
}

export function normalizeNeteaseDirectMediaUrl(sourceUrl) {
  const url = String(sourceUrl || "");
  if (!url) return "";
  if (!isNeteaseMediaUrl(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:") parsed.protocol = "https:";
    return String(parsed);
  } catch {
    return url;
  }
}

export function getAndroidMediaProxyUrl(sourceUrl, { type = "audio", songId = "", size = "" } = {}) {
  const normalizedUrl = normalizeNeteaseDirectMediaUrl(sourceUrl);
  if (!normalizedUrl || !isNeteaseMediaUrl(normalizedUrl)) return normalizedUrl;
  const params = new URLSearchParams({ url: normalizedUrl });
  if (songId) params.set("songId", String(songId));
  if (size) params.set("size", String(size));
  return `${androidMediaProxyBaseUrl}/claude/media/${type}?${params}`;
}

export function getNeteaseThumbnailUrl(sourceUrl, target = "list") {
  const normalizedUrl = normalizeNeteaseDirectMediaUrl(sourceUrl);
  if (!normalizedUrl || !isNeteaseMediaUrl(normalizedUrl)) return normalizedUrl;
  try {
    const parsed = new URL(normalizedUrl);
    const size = getNeteaseCoverSize(target);
    parsed.searchParams.set("param", `${size}y${size}`);
    return String(parsed);
  } catch {
    return normalizedUrl;
  }
}

export function getNeteaseCoverProxyUrl(sourceUrl, target = "list") {
  const url = String(sourceUrl || "");
  if (!url || !isNeteaseMediaUrl(url)) return url;
  if (isAndroidRuntime()) return getNeteaseThumbnailUrl(url, target);
  const params = new URLSearchParams({
    url,
    size: String(getNeteaseCoverSize(target))
  });
  return `/api/media/cover?${params}`;
}

export function getNeteaseAudioProxyUrl(track = {}) {
  if (track?.source !== "netease" && !track?.sourceId) return track?.src || "";
  if (isAndroidRuntime()) {
    return track.src
      ? getAndroidMediaProxyUrl(track.src, { type: "audio", songId: track.sourceId || "" })
      : "";
  }
  const params = new URLSearchParams();
  if (track.sourceId) params.set("songId", String(track.sourceId));
  if (track.src && isNeteaseMediaUrl(track.src)) params.set("url", track.src);
  const query = params.toString();
  return query ? `/api/media/audio?${query}` : "";
}

export function preloadNeteaseCovers(tracks = [], target = "list", limit = 20, options = {}) {
  return preloadNeteaseCoverSlice(tracks, { target, limit, ...options });
}

export function preloadNeteaseCoverSlice(tracks = [], {
  target = "list",
  limit = 20,
  offset = 0,
  priority = "high",
  api
} = {}) {
  if (isAndroidRuntime()) return;
  const items = tracks
    .slice(Math.max(0, Number(offset || 0)))
    .map((track) => ({ url: track?.cover || "", size: getNeteaseCoverSize(target) }))
    .filter((item) => item.url && isNeteaseMediaUrl(item.url))
    .slice(0, limit);
  if (!items.length) return;
  dispatchPreloadRequest(api, "/api/media/preload-covers", {
    method: "POST",
    body: JSON.stringify({ items, priority })
  });
}

export function buildCoverPreloadPlan(tracks = [], target = "list", { viewportCount = 20, nextCount = 20 } = {}) {
  const count = tracks.filter((track) => track?.cover && isNeteaseMediaUrl(track.cover)).length;
  const firstEnd = Math.min(viewportCount, count);
  const secondEnd = Math.min(firstEnd + nextCount, count);
  return [
    firstEnd > 0 ? { target, start: 0, end: firstEnd, priority: "high", items: firstEnd } : null,
    secondEnd > firstEnd ? { target, start: firstEnd, end: secondEnd, priority: "low", items: secondEnd - firstEnd } : null
  ].filter(Boolean);
}

export function shouldPreloadMoreCovers({ scrollTop = 0, clientHeight = 0, scrollHeight = 0, threshold = 160 } = {}) {
  return Number(scrollTop || 0) + Number(clientHeight || 0) >= Number(scrollHeight || 0) - Number(threshold || 0);
}

export function preloadNeteaseAudio(tracks = [], limit = 3, { api } = {}) {
  if (isAndroidRuntime()) return;
  const items = buildNeteaseAudioPreloadItems(tracks, limit);
  if (!items.length) return;
  dispatchPreloadRequest(api, "/api/media/preload-audio", {
    method: "POST",
    body: JSON.stringify({ items })
  });
}

export function buildNeteaseAudioPreloadItems(tracks = [], limit = 3) {
  const safeLimit = Math.min(3, Math.max(0, Number(limit || 0)));
  // 只预取当前播放附近的少量歌曲，避免进入大歌单时把整张歌单音频都下载到 APK/本地缓存。
  return tracks
    .filter((track) => track?.source === "netease" && track.sourceId)
    .slice(0, safeLimit)
    .map((track) => ({ songId: track.sourceId, url: isNeteaseMediaUrl(track.src) ? track.src : "" }));
}

function isNeteaseMediaUrl(sourceUrl) {
  try {
    const url = new URL(String(sourceUrl || ""));
    return /^https?:$/.test(url.protocol) && /(^|\.)music\.126\.net$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function dispatchPreloadRequest(api, path, options) {
  const requestOptions = {
    weatherLocationQuery: false,
    ...options
  };
  const dispatcher = typeof api === "function"
    ? api
    : typeof fetch === "function"
      ? (url, fetchOptions) => fetch(url, {
          headers: { "content-type": "application/json" },
          ...fetchOptions
        })
      : null;
  if (!dispatcher) return;
  dispatcher(path, requestOptions).catch(() => {});
}
