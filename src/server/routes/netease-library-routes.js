export function registerNeteaseLibraryRoutes(router, {
  getKv,
  neteaseRequest,
  parseBody,
  normalizePlaybackTrack,
  upsertTrack,
  updateLocalLikeState,
  syncRemoteLikeState,
  enqueueSyncJob,
  getLocalLikedNeteasePlaylist,
  getLocalNeteasePlaylists,
  updateLocalPlaylistTracks,
  syncRemotePlaylistTracks,
  getLocalNeteasePlaylistDetail,
  sendJson
}) {
  router.get("/api/netease/like/list", async ({ res, url }) => {
    const profile = JSON.parse(getKv("netease.profile", "null") || "null");
    const uid = url.searchParams.get("uid") || profile?.userId;
    if (!uid) {
      sendJson(res, 200, { ok: true, ids: [] });
      return;
    }
    const data = await neteaseRequest("/likelist", { uid }, { auth: true }).catch(() => ({ ids: [] }));
    sendJson(res, 200, { ok: true, ids: data.ids || [] });
  });

  router.post("/api/netease/like", async ({ req, res }) => {
    const profile = JSON.parse(getKv("netease.profile", "null") || "null");
    const ownerUserId = String(profile?.userId || profile?.user?.userId || "");
    const body = await parseBody(req);
    const id = String(body.id || "");
    const like = body.like !== false;
    if (!id) {
      sendJson(res, 400, { error: "Song id is required" });
      return;
    }
    const payload = { id, like };
    const localTrack = normalizePlaybackTrack(body.track, { sourceTrackId: id, source: "netease" });
    if (localTrack?.sourceId === id) upsertTrack(localTrack);
    const localChanged = updateLocalLikeState(id, like, { ownerUserId });
    // 收藏操作先落本地，远端失败时入队补偿；这样 UI 能即时反馈，不被网易云网络状态拖住。
    const data = await syncRemoteLikeState(id, like)
      .catch((error) => {
        enqueueSyncJob("netease.like", payload);
        return { offline: true, message: error instanceof Error ? error.message : String(error) };
      });
    const likedPlaylist = getLocalLikedNeteasePlaylist({ ownerUserId });
    sendJson(res, 200, {
      ok: true,
      liked: like,
      localChanged,
      likedPlaylist,
      playlists: getLocalNeteasePlaylists({ ownerUserId }),
      pendingSync: Boolean(data.offline),
      result: data
    });
  });

  router.post("/api/netease/playlist/tracks", async ({ req, res }) => {
    const profile = JSON.parse(getKv("netease.profile", "null") || "null");
    const ownerUserId = String(profile?.userId || profile?.user?.userId || "");
    const body = await parseBody(req);
    const playlistId = String(body.playlistId || "");
    const songIds = Array.isArray(body.songIds) ? body.songIds.join(",") : String(body.songIds || body.songId || "");
    const op = body.op === "del" ? "del" : "add";
    const placement = body.placement === "prepend" ? "prepend" : "append";
    if (!playlistId || !songIds) {
      sendJson(res, 400, { error: "playlistId and songIds are required" });
      return;
    }
    const payload = { playlistId, songIds, op, placement };
    const tracks = Array.isArray(body.tracks) ? body.tracks : (body.track ? [body.track] : []);
    tracks
      .map((track) => normalizePlaybackTrack(track, { source: "netease" }))
      .filter(Boolean)
      .forEach(upsertTrack);
    const localChanged = updateLocalPlaylistTracks({ playlistId, songIds: songIds.split(","), op, placement, ownerUserId });
    const data = await syncRemotePlaylistTracks({ playlistId, songIds: songIds.split(","), op })
      .catch((error) => {
        enqueueSyncJob(`netease.playlist.${op}`, payload);
        return { offline: true, message: error instanceof Error ? error.message : String(error) };
      });
    sendJson(res, 200, {
      ok: true,
      localChanged,
      playlist: getLocalNeteasePlaylistDetail(playlistId, { ownerUserId }),
      playlists: getLocalNeteasePlaylists({ ownerUserId }),
      pendingSync: Boolean(data.offline),
      result: data
    });
  });
}
