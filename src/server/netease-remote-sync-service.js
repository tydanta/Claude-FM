export function createNeteaseRemoteSyncService({
  config,
  db,
  getStoredNeteaseProfile,
  setKv,
  neteaseRequest,
  normalizeNeteasePlaylist,
  normalizeNeteaseTrack,
  isLikedNeteasePlaylist,
  upsertPlaylist,
  replacePlaylistTracks,
  getLocalNeteasePlaylists,
  getLocalNeteasePlaylistDetail,
  getLocalLikedTracks,
  prefetchNeteaseSongUrls,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  warn = console.warn,
  syncAllNeteasePlaylistDetails: syncAllOverride = null
}) {
  let neteaseFullSyncPromise = null;

  function getStoredNeteaseUserId() {
    const profile = getStoredNeteaseProfile();
    return String(profile?.userId || profile?.user?.userId || "");
  }

  function extractRemotePlaylistTrackIds(data = {}) {
    const trackIds = data.playlist?.trackIds || data.trackIds || [];
    if (Array.isArray(trackIds) && trackIds.length) {
      return trackIds
        .map((item) => String(item?.id || item || ""))
        .filter(Boolean);
    }
    const tracks = data.playlist?.tracks || data.songs || [];
    return Array.isArray(tracks)
      ? tracks.map((item) => String(item?.id || item?.songId || "")).filter(Boolean)
      : [];
  }

  async function getRemoteLikedIds() {
    const uid = getStoredNeteaseUserId();
    if (!uid) return [];
    const data = await neteaseRequest("/likelist", { uid }, { auth: true });
    return (data.ids || []).map((id) => String(id));
  }

  async function getRemotePlaylistTrackIds(playlistId) {
    const detail = await neteaseRequest("/playlist/detail", { id: playlistId }, { auth: true });
    const ids = extractRemotePlaylistTrackIds(detail);
    if (ids.length) return ids;
    const all = await neteaseRequest("/playlist/track/all", { id: playlistId, limit: 1000 }, { auth: true });
    return extractRemotePlaylistTrackIds(all);
  }

  async function syncRemoteLikeState(songId, like) {
    const expected = Boolean(like);
    const attempts = [
      () => neteaseRequest("/like", { id: songId, like: String(expected) }, { auth: true, method: "POST" }),
      () => neteaseRequest("/like", { id: songId, like: String(expected) }, { auth: true }),
      () => neteaseRequest("/like", { id: songId, like: expected ? "true" : "false" }, { auth: true, method: "POST" })
    ];
    let lastResult = null;
    let lastError = null;
    for (const attempt of attempts) {
      try {
        lastResult = await attempt();
        await sleep(350);
        const liked = (await getRemoteLikedIds()).includes(String(songId));
        if (liked === expected) return lastResult;
        lastError = new Error(`网易云喜欢状态未同步，期望 ${expected ? "喜欢" : "取消喜欢"}，实际 ${liked ? "仍喜欢" : "未喜欢"}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("网易云喜欢状态同步失败");
  }

  async function syncRemotePlaylistTracks({ playlistId, songIds, op }) {
    const ids = [...new Set((Array.isArray(songIds) ? songIds : String(songIds || "").split(","))
      .map((id) => String(id || "").trim())
      .filter(Boolean))];
    const tracks = ids.join(",");
    const expectedPresent = op !== "del";
    const attempts = [
      () => neteaseRequest("/playlist/tracks", { op, pid: playlistId, tracks }, { auth: true, method: "POST" }),
      () => neteaseRequest("/playlist/tracks", { op, pid: playlistId, tracks }, { auth: true }),
      () => neteaseRequest("/playlist/tracks", { op, pid: playlistId, tracks, trackIds: JSON.stringify(ids) }, { auth: true, method: "POST" })
    ];
    let lastResult = null;
    let lastError = null;
    for (const attempt of attempts) {
      try {
        lastResult = await attempt();
        await sleep(500);
        const remoteIds = await getRemotePlaylistTrackIds(playlistId);
        const inRemote = ids.every((id) => remoteIds.includes(id));
        if (inRemote === expectedPresent) return lastResult;
        lastError = new Error(`网易云歌单未同步，期望歌曲${expectedPresent ? "存在" : "移除"}，实际${inRemote ? "仍存在" : "不存在"}`);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("网易云歌单同步失败");
  }

  async function syncNeteaseUserPlaylists() {
    const status = await neteaseRequest("/login/status", {}, { auth: true });
    const profile = status.data?.profile || status.profile || {};
    const userId = String(profile.userId || profile.user?.userId || "");
    if (!userId) {
      return { loggedIn: false, profile: null, playlists: [] };
    }
    setKv("netease.profile", JSON.stringify(profile));
    const data = await neteaseRequest("/user/playlist", { uid: userId, limit: 1000 }, { auth: true });
    const playlists = (data.playlist || []).map((playlist, index) => {
      const displayOrder = isLikedNeteasePlaylist(playlist) ? -100000 : index;
      return normalizeNeteasePlaylist(playlist, [], displayOrder, userId);
    });
    const tx = db.transaction(() => playlists.forEach(upsertPlaylist));
    tx();
    return { loggedIn: true, profile, playlists: getLocalNeteasePlaylists({ ownerUserId: userId }) };
  }

  async function syncNeteasePlaylistDetail(playlistId) {
    const ownerUserId = getStoredNeteaseUserId();
    const detail = await neteaseRequest("/playlist/detail", { id: playlistId }, { auth: true });
    const all = await neteaseRequest("/playlist/track/all", { id: playlistId, limit: 1000 }, { auth: true });
    let tracks = (all.songs || detail.playlist?.tracks || []).map(normalizeNeteaseTrack);
    const existing = getLocalNeteasePlaylistDetail(playlistId, { ownerUserId });
    const isLikedPlaylist = isLikedNeteasePlaylist(detail.playlist || {}) || Number(existing?.displayOrder || 0) < 0;
    if (isLikedPlaylist) {
      const bySourceId = new Map(tracks.map((track) => [track.sourceId, track]));
      getLocalLikedTracks().forEach((track) => {
        if (track.sourceId && !bySourceId.has(track.sourceId)) bySourceId.set(track.sourceId, track);
      });
      tracks = [...bySourceId.values()];
    }
    const playlist = normalizeNeteasePlaylist(detail.playlist || { id: playlistId }, tracks, existing?.displayOrder || 0, ownerUserId);
    upsertPlaylist(playlist);
    replacePlaylistTracks(playlist.id, tracks);
    prefetchNeteaseSongUrls(tracks.map((track) => track.sourceId), config.neteaseAudioLevel, 8);
    return playlist;
  }

  async function syncAllNeteasePlaylistDetails({ force = false } = {}) {
    const ownerUserId = getStoredNeteaseUserId();
    const playlists = getLocalNeteasePlaylists({ ownerUserId });
    let synced = 0;
    let skipped = 0;
    for (const playlist of playlists) {
      if (!playlist?.sourceId) continue;
      const localDetail = getLocalNeteasePlaylistDetail(playlist.sourceId, { ownerUserId });
      const cachedCount = Number(localDetail?.tracks?.length || 0);
      const expectedCount = Number(localDetail?.trackCount || playlist.trackCount || 0);
      if (!force && cachedCount && (!expectedCount || cachedCount >= expectedCount)) {
        skipped += 1;
        continue;
      }
      try {
        await syncNeteasePlaylistDetail(playlist.sourceId);
        synced += 1;
      } catch (error) {
        warn(`Netease playlist detail sync failed (${playlist.sourceId}):`, error instanceof Error ? error.message : String(error));
      }
    }
    return { synced, skipped, total: playlists.length };
  }

  function scheduleNeteaseFullSync(options = {}) {
    if (neteaseFullSyncPromise) return neteaseFullSyncPromise;
    const syncAll = syncAllOverride || syncAllNeteasePlaylistDetails;
    neteaseFullSyncPromise = syncAll(options)
      .catch((error) => {
        warn("Netease full playlist sync failed:", error instanceof Error ? error.message : String(error));
        return null;
      })
      .finally(() => {
        neteaseFullSyncPromise = null;
      });
    return neteaseFullSyncPromise;
  }

  return {
    getStoredNeteaseUserId,
    extractRemotePlaylistTrackIds,
    getRemoteLikedIds,
    getRemotePlaylistTrackIds,
    syncRemoteLikeState,
    syncRemotePlaylistTracks,
    syncNeteaseUserPlaylists,
    syncNeteasePlaylistDetail,
    syncAllNeteasePlaylistDetails,
    scheduleNeteaseFullSync
  };
}
