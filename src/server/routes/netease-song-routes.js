import { normalizeNeteaseAudioLevel as defaultNormalizeNeteaseAudioLevel } from "../netease-adapter.js";

export function registerNeteaseSongRoutes(router, {
  config,
  normalizeNeteaseAudioLevel = defaultNormalizeNeteaseAudioLevel,
  getNeteaseSongUrl,
  readNeteaseUrlCache,
  getLocalTrackBySourceId,
  getNeteaseLyrics,
  prefetchNeteaseSongUrls,
  parseBody,
  warn = console.warn,
  sendJson
}) {
  router.get("/api/netease/song/url", async ({ res, url }) => {
    const id = url.searchParams.get("id");
    if (!id) {
      sendJson(res, 400, { error: "Song id is required" });
      return;
    }
    const level = normalizeNeteaseAudioLevel(url.searchParams.get("level") || config.neteaseAudioLevel);
    const result = await getNeteaseSongUrl(id, level, {
      metadata: true,
      refresh: url.searchParams.get("refresh") === "1"
    }).catch((error) => {
      if (error?.code === "NETEASE_FREE_TRIAL_ONLY") {
        return {
          errorOnly: true,
          status: 403,
          payload: {
            ok: false,
            code: "NETEASE_FREE_TRIAL_ONLY",
            error: "这首歌网易云只返回 30 秒试听，暂时无法播放完整版。",
            id,
            trial: error.trial || null
          }
        };
      }
      const stale = readNeteaseUrlCache(id, level, { allowExpired: true });
      if (stale) {
        warn(`Netease URL unavailable (${id}), using stale cache:`, error instanceof Error ? error.message : String(error));
        return { url: stale.url, cached: true, stale: true, expiresAt: stale.expiresAt };
      }
      const localTrack = getLocalTrackBySourceId(id);
      if (localTrack?.src) {
        // 播放链路优先保证“能响”：远端不可用时，本地已保存音源可以作为最后兜底。
        return { url: localTrack.src, cached: true, stale: true, expiresAt: 0 };
      }
      throw error;
    });
    if (result.errorOnly) {
      sendJson(res, result.status, result.payload);
      return;
    }
    sendJson(res, 200, {
      ok: true,
      id,
      src: result.url,
      cached: result.cached,
      stale: Boolean(result.stale),
      expiresAt: result.expiresAt
    });
  });

  router.get("/api/lyrics", async ({ res, url }) => {
    const source = url.searchParams.get("source") || "netease";
    const id = url.searchParams.get("id");
    if (!id) {
      sendJson(res, 400, { error: "Song id is required" });
      return;
    }
    if (source !== "netease") {
      sendJson(res, 200, { ok: true, source, sourceId: id, lyric: "", translatedLyric: "", romajiLyric: "", cached: true });
      return;
    }
    const lyrics = await getNeteaseLyrics(id, { refresh: url.searchParams.get("refresh") === "1" });
    sendJson(res, 200, {
      ok: true,
      ...lyrics
    });
  });

  router.post("/api/netease/song/url/prefetch", async ({ req, res }) => {
    const body = await parseBody(req);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const level = normalizeNeteaseAudioLevel(body.level || config.neteaseAudioLevel);
    const limit = Number.isInteger(Number(body.limit)) ? Number(body.limit) : 8;
    prefetchNeteaseSongUrls(ids, level, limit);
    sendJson(res, 200, {
      ok: true,
      count: Math.min(ids.filter(Boolean).length, limit)
    });
  });
}
