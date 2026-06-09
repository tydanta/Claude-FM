export function registerNeteasePlaylistRoutes(router, {
  getStoredNeteaseProfile,
  getLocalNeteasePlaylists,
  hasNeteaseLoginCookie,
  scheduleNeteaseFullSync,
  syncNeteaseUserPlaylists,
  syncNeteasePlaylistDetail,
  getLocalNeteasePlaylistDetail,
  mapNeteaseTracksWithUrls,
  isGenericPlaylistDescription,
  refreshNeteasePlaylistMetadata,
  warn = console.warn,
  sendJson
}) {
  router.get("/api/netease/playlists", async ({ res, url }) => {
    const shouldRefresh = url.searchParams.get("refresh") === "1";
    const profile = getStoredNeteaseProfile();
    const ownerUserId = String(profile?.userId || profile?.user?.userId || "");
    const localPlaylists = getLocalNeteasePlaylists({ ownerUserId });
    const cookieReady = hasNeteaseLoginCookie();
    const hasStableOrder = localPlaylists.length <= 1 || localPlaylists.some((playlist) => Number(playlist.displayOrder || 0) !== 0);
    // 歌单列表是前端启动关键路径；有稳定本地顺序时先返回缓存，再后台同步，避免远端抖动卡住首页。
    if (!shouldRefresh && localPlaylists.length && hasStableOrder) {
      scheduleNeteaseFullSync();
      sendJson(res, 200, {
        ok: true,
        loggedIn: Boolean(profile?.userId || cookieReady),
        cookieReady,
        profile,
        playlists: localPlaylists,
        source: "local-cache"
      });
      return;
    }
    const synced = await syncNeteaseUserPlaylists().catch((error) => {
      warn("Netease playlist sync unavailable, using local cache:", error instanceof Error ? error.message : String(error));
      return {
        loggedIn: false,
        offline: true,
        profile,
        playlists: localPlaylists,
        syncError: error instanceof Error ? error.message : String(error)
      };
    });
    if (!synced.offline) {
      const likedPlaylist = (synced.playlists || []).find((playlist) =>
        Number(playlist.displayOrder || 0) < 0 || /喜欢的音乐/.test(playlist.title || "")
      );
      if (likedPlaylist?.sourceId) {
        await syncNeteasePlaylistDetail(likedPlaylist.sourceId).catch((error) => {
          warn("Netease liked playlist detail sync failed:", error instanceof Error ? error.message : String(error));
        });
      }
      synced.playlists = getLocalNeteasePlaylists({ ownerUserId: String((synced.profile || profile)?.userId || (synced.profile || profile)?.user?.userId || "") });
    }
    sendJson(res, 200, {
      ok: true,
      ...synced,
      loggedIn: Boolean(synced.loggedIn || synced.profile?.userId || profile?.userId || cookieReady),
      cookieReady,
      profile: synced.profile || profile,
      source: synced.offline ? "local-cache" : "netease"
    });
    if (!synced.offline) scheduleNeteaseFullSync({ force: true });
  });

  router.get("/api/netease/playlist", async ({ res, url }) => {
    const id = url.searchParams.get("id");
    if (!id) {
      sendJson(res, 400, { error: "Playlist id is required" });
      return;
    }
    const shouldRefresh = url.searchParams.get("refresh") === "1";
    const localOnly = url.searchParams.get("local") === "1";
    const profile = getStoredNeteaseProfile();
    const ownerUserId = String(profile?.userId || profile?.user?.userId || "");
    let source = "local-cache";
    let playlist = shouldRefresh ? null : getLocalNeteasePlaylistDetail(id, { ownerUserId });
    if (localOnly) {
      playlist = getLocalNeteasePlaylistDetail(id, { ownerUserId });
    } else if (!playlist?.tracks?.length) {
      playlist = await syncNeteasePlaylistDetail(id).then((syncedPlaylist) => {
        source = "netease";
        return syncedPlaylist;
      }).catch((error) => {
        warn(`Netease playlist detail unavailable (${id}), using local cache:`, error instanceof Error ? error.message : String(error));
        source = "local-cache";
        return getLocalNeteasePlaylistDetail(id, { ownerUserId });
      });
    } else if (shouldRefresh && isGenericPlaylistDescription(playlist.description)) {
      const refreshed = await refreshNeteasePlaylistMetadata(playlist);
      if (refreshed !== playlist) {
        playlist = refreshed;
        source = "netease-metadata";
      }
    }
    if (!playlist) {
      sendJson(res, 404, { ok: false, error: "本地没有保存这个歌单，且网易云暂时不可用。" });
      return;
    }
    const withUrls = url.searchParams.get("urls") === "1";
    playlist.tracks = await mapNeteaseTracksWithUrls(playlist.tracks, { includeUrls: withUrls });
    sendJson(res, 200, {
      ok: true,
      playlist,
      source
    });
  });
}
