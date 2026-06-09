export function registerNeteaseRecommendationRoutes(router, {
  config,
  normalizeDailyRecommendDate,
  getLocalDateKey,
  getLocalDailyRecommendations,
  getDailyRecommendPlaylistMeta,
  neteaseRequest,
  normalizeNeteaseTrack,
  replaceDailyRecommendations,
  prefetchNeteaseSongUrls,
  sendJson
}) {
  router.get("/api/netease/recommend/songs", async ({ res, url }) => {
    const date = normalizeDailyRecommendDate(
      url.searchParams.get("date") || (url.searchParams.get("history") === "1" ? "yesterday" : "today")
    );
    const today = getLocalDateKey(0);
    const safeLimit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 30));
    const localOnly = url.searchParams.get("local") === "1" || date !== today;
    // 历史每日推荐不会再变化，优先走本地；今天推荐才尝试远端刷新并写回缓存。
    if (localOnly) {
      const songs = getLocalDailyRecommendations(date).slice(0, safeLimit);
      sendJson(res, 200, {
        ok: true,
        date,
        source: "local",
        songs,
        playlist: getDailyRecommendPlaylistMeta(date, songs)
      });
      return;
    }
    try {
      const data = await neteaseRequest("/recommend/songs", { limit: safeLimit }, { auth: true });
      const songs = (data.data?.dailySongs || data.recommend || []).map(normalizeNeteaseTrack).slice(0, safeLimit);
      const storedSongs = replaceDailyRecommendations(date, songs);
      prefetchNeteaseSongUrls(storedSongs.map((track) => track.sourceId), config.neteaseAudioLevel, 3);
      sendJson(res, 200, {
        ok: true,
        date,
        source: "remote",
        songs: storedSongs,
        playlist: getDailyRecommendPlaylistMeta(date, storedSongs)
      });
      return;
    } catch (error) {
      const songs = getLocalDailyRecommendations(date).slice(0, safeLimit);
      sendJson(res, 200, {
        ok: Boolean(songs.length),
        date,
        source: "local",
        offline: true,
        error: error instanceof Error ? error.message : String(error),
        songs,
        playlist: getDailyRecommendPlaylistMeta(date, songs)
      });
    }
  });

  router.get("/api/netease/personal-fm", async ({ res }) => {
    const data = await neteaseRequest("/personal_fm", {}, { auth: true });
    sendJson(res, 200, {
      ok: true,
      songs: (data.data || []).map(normalizeNeteaseTrack)
    });
  });

  router.get("/api/netease/heartbeat", async ({ res, url }) => {
    const id = String(url.searchParams.get("id") || "");
    const pid = String(url.searchParams.get("pid") || "");
    if (!id) {
      sendJson(res, 400, { error: "id is required" });
      return;
    }
    const params = {
      id,
      songId: id,
      startMusicId: id,
      limit: Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 50))
    };
    if (pid) {
      params.pid = pid;
      params.playlistId = pid;
    }
    const data = await neteaseRequest("/playmode/intelligence/list", params, { auth: true });
    const rawSongs = data.data || data.songs || data.recommend || [];
    const songs = rawSongs
      .map((item) => item.songInfo || item.song || item)
      .map(normalizeNeteaseTrack)
      .filter((track) => track.sourceId);
    prefetchNeteaseSongUrls(songs.map((track) => track.sourceId), config.neteaseAudioLevel, 4);
    sendJson(res, 200, {
      ok: true,
      songs
    });
  });
}
