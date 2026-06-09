export function registerNeteaseDiscoveryRoutes(router, {
  neteaseRequest,
  normalizeNeteaseTrack,
  upsertTrack,
  getLocalNeteaseTrackSearch,
  getLocalNeteaseArtistPage,
  warn = console.warn,
  sendJson
}) {
  router.get("/api/netease/search", async ({ res, url }) => {
    const keywords = url.searchParams.get("keywords") || "";
    const type = url.searchParams.get("type") || "1";
    const limit = url.searchParams.get("limit") || "30";
    const offset = url.searchParams.get("offset") || "0";
    if (!keywords.trim()) {
      sendJson(res, 200, { ok: true, songs: [], playlists: [], artists: [] });
      return;
    }
    const data = await neteaseRequest("/search", { keywords, type, limit, offset }, { auth: true }).catch((error) => {
      const songs = getLocalNeteaseTrackSearch(keywords, limit);
      // 搜索页允许离线浏览历史缓存，避免网络失败时把用户带到空页面。
      warn("Netease search unavailable, using local cache:", error instanceof Error ? error.message : String(error));
      return { result: { songs, playlists: [], artists: [] }, offline: true };
    });
    const result = data.result || {};
    const songs = data.offline ? (result.songs || []) : (result.songs || []).map(normalizeNeteaseTrack);
    songs.forEach(upsertTrack);
    sendJson(res, 200, {
      ok: true,
      offline: Boolean(data.offline),
      source: data.offline ? "local-cache" : "netease",
      songs,
      hasMore: Boolean(result.hasMore),
      playlists: result.playlists || [],
      artists: result.artists || []
    });
  });

  router.get("/api/netease/artist", async ({ res, url }) => {
    const id = url.searchParams.get("id");
    const name = url.searchParams.get("name");
    let artistId = id;
    let searchedArtist = null;
    if (!artistId && name) {
      const search = await neteaseRequest("/search", { keywords: name, type: 100, limit: 1 }, { auth: true }).catch(() => ({}));
      searchedArtist = search.result?.artists?.[0] || null;
      artistId = searchedArtist?.id;
    }
    if (!artistId) {
      const localArtist = getLocalNeteaseArtistPage({ name });
      sendJson(res, 200, { ok: true, offline: true, source: "local-cache", ...localArtist });
      return;
    }
    const [detail, songs, albums] = await Promise.all([
      neteaseRequest("/artist/detail", { id: artistId }, { auth: true }).catch(() => ({})),
      neteaseRequest("/artist/songs", { id: artistId, limit: 50 }, { auth: true }).catch(() => ({})),
      neteaseRequest("/artist/album", { id: artistId, limit: 20 }, { auth: true }).catch(() => ({}))
    ]);
    const artist = detail.data?.artist || songs.artist || albums.artist || searchedArtist || { id: artistId, name: name || "歌手" };
    const offline = !detail.data && !songs.songs?.length && !albums.hotAlbums?.length;
    if (offline) {
      const localArtist = getLocalNeteaseArtistPage({ id: artistId, name });
      sendJson(res, 200, { ok: true, offline: true, source: "local-cache", ...localArtist });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      source: "netease",
      artistId,
      artist,
      songs: (songs.songs || []).map(normalizeNeteaseTrack),
      albums: albums.hotAlbums || []
    });
  });

  router.get("/api/netease/album", async ({ res, url }) => {
    const id = url.searchParams.get("id") || "";
    if (!id.trim()) {
      sendJson(res, 400, { ok: false, error: "album id is required" });
      return;
    }
    const data = await neteaseRequest("/album", { id }, { auth: true }).catch((error) => {
      warn("Netease album unavailable:", error instanceof Error ? error.message : String(error));
      return null;
    });
    if (!data) {
      sendJson(res, 200, { ok: true, offline: true, source: "local-cache", album: { id }, tracks: [] });
      return;
    }
    const tracks = (data.songs || data.album?.songs || []).map(normalizeNeteaseTrack);
    tracks.forEach(upsertTrack);
    sendJson(res, 200, {
      ok: true,
      source: "netease",
      album: data.album || { id },
      tracks
    });
  });
}
