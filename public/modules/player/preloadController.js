import { getUpcomingTracks as getUpcomingTracksFromQueue } from "./queueController.js";
import { isLocalAppRuntime } from "../runtime/platform.js";

export function createPreloadController({
  api,
  getCurrentIndex,
  getPlayMode,
  getDjModeEnabled,
  getWeatherBody,
  neteaseApi,
  preloadNeteaseAudio,
  preloadNeteaseCoverSlice,
  buildCoverPreloadPlan,
  shouldPreloadMoreCovers,
  preloadQueueInsights = () => {},
  isLocalPreloadRuntime = isLocalAppRuntime,
  setTimeoutFn = window.setTimeout,
  logger = console
}) {
  const warmedSongIds = new Set();
  let serverPrewarmRunId = 0;

  function prewarmVisibleCovers(tracks = [], target = "list") {
    const plan = buildCoverPreloadPlan(tracks, target);
    plan.forEach((step) => {
      preloadNeteaseCoverSlice(tracks, {
        target: step.target,
        offset: step.start,
        limit: step.items,
        priority: step.priority,
        api
      });
    });
  }

  function prewarmMoreCoversOnScroll(scroller, tracks = [], target = "list") {
    if (!scroller || !shouldPreloadMoreCovers(scroller)) return;
    const loaded = Number(scroller.dataset.coverPreloadOffset || 40);
    if (loaded >= tracks.length) return;
    preloadNeteaseCoverSlice(tracks, {
      target,
      offset: loaded,
      limit: 20,
      priority: "low",
      api
    });
    scroller.dataset.coverPreloadOffset = String(loaded + 20);
  }

  function prewarmNeteaseUrls(tracks = [], limit = 3) {
    const safeLimit = Math.min(3, Math.max(0, Number(limit || 0)));
    const ids = [];
    for (const track of tracks) {
      const id = String(track?.sourceId || "");
      if (!id || warmedSongIds.has(id)) continue;
      ids.push(id);
      warmedSongIds.add(id);
      if (ids.length >= safeLimit) break;
    }
    if (!ids.length) return;
    neteaseApi.prefetchSongUrls(ids.map((id) => ({ sourceId: id }))).catch(() => {
      ids.forEach((id) => warmedSongIds.delete(id));
    });
    // 只预取当前播放附近的少量音频，避免进入大歌单时把整张歌单下载到本地/APK 缓存。
    preloadNeteaseAudio(tracks, safeLimit, { api });
  }

  function getUpcomingTracks(queue = [], count = 3) {
    return getUpcomingTracksFromQueue(queue, getCurrentIndex(queue), getPlayMode(), count);
  }

  function prewarmNextNeteaseUrls(queue = []) {
    const nextTracks = getUpcomingTracks(queue, 3).filter((track) => track?.source === "netease");
    prewarmNeteaseUrls(nextTracks, 3);
  }

  function prewarmServerQueue(queue = []) {
    if (isLocalPreloadRuntime()) return;
    if (!getDjModeEnabled()) return;
    if (!queue.length) return;
    const runId = ++serverPrewarmRunId;
    const startIndex = getCurrentIndex(queue);
    setTimeoutFn(() => {
      if (runId !== serverPrewarmRunId) return;
      api("/api/prewarm", {
        method: "POST",
        body: JSON.stringify(getWeatherBody({ startIndex, limit: 3 }))
      }).catch((error) => {
        logger.warn?.("server prewarm failed", error);
      });
    }, 900);
  }

  function warmUpcomingQueue(queue = []) {
    prewarmNextNeteaseUrls(queue);
    preloadQueueInsights(queue);
    prewarmServerQueue(queue);
  }

  return {
    clearNeteaseUrlWarmCache: () => warmedSongIds.clear(),
    getUpcomingTracks,
    prewarmMoreCoversOnScroll,
    prewarmNeteaseUrls,
    prewarmNextNeteaseUrls,
    prewarmServerQueue,
    prewarmVisibleCovers,
    warmUpcomingQueue
  };
}
