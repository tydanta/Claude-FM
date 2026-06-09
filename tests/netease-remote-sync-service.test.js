import assert from "node:assert/strict";
import { createNeteaseRemoteSyncService } from "../src/server/netease-remote-sync-service.js";

function createService(overrides = {}) {
  const calls = [];
  const kv = new Map();
  const localPlaylists = overrides.localPlaylists || [];
  const localDetails = new Map(Object.entries(overrides.localDetails || {}));
  const service = createNeteaseRemoteSyncService({
    config: { neteaseAudioLevel: "standard" },
    db: { transaction: (fn) => () => fn() },
    getStoredNeteaseProfile: () => overrides.profile || { userId: "uid-1" },
    setKv: (key, value) => kv.set(key, value),
    neteaseRequest: async (pathname, params, options) => {
      calls.push(["request", pathname, params, options]);
      if (overrides.requestImpl) return overrides.requestImpl(pathname, params, options, calls);
      if (pathname === "/login/status") return { data: { profile: { userId: "uid-1", nickname: "DJ" } } };
      if (pathname === "/user/playlist") return { playlist: [{ id: "liked", name: "喜欢的音乐" }, { id: "p1", name: "Focus" }] };
      if (pathname === "/playlist/detail") return { playlist: { id: params.id, name: `Playlist ${params.id}`, trackIds: [{ id: 1 }, { id: 2 }] } };
      if (pathname === "/playlist/track/all") return { songs: [{ id: 1, name: "A" }, { id: 2, name: "B" }] };
      if (pathname === "/likelist") return { ids: overrides.likedIds || [] };
      return { code: 200 };
    },
    normalizeNeteasePlaylist: (playlist, tracks = [], displayOrder = 0, ownerUserId = "") => ({
      id: `local-${playlist.id}`,
      sourceId: String(playlist.id),
      ownerUserId,
      title: playlist.name || playlist.title || "",
      displayOrder,
      trackCount: playlist.trackCount || tracks.length,
      tracks
    }),
    normalizeNeteaseTrack: (track) => ({ id: `track-${track.id}`, sourceId: String(track.id), title: track.name || "" }),
    isLikedNeteasePlaylist: (playlist) => String(playlist.name || playlist.title || "").includes("喜欢"),
    upsertPlaylist: (playlist) => calls.push(["upsertPlaylist", playlist]),
    replacePlaylistTracks: (playlistId, tracks) => calls.push(["replaceTracks", playlistId, tracks]),
    getLocalNeteasePlaylists: (options = {}) => {
      calls.push(["getLocalNeteasePlaylists", options]);
      return localPlaylists;
    },
    getLocalNeteasePlaylistDetail: (id, options = {}) => {
      calls.push(["getLocalNeteasePlaylistDetail", id, options]);
      return localDetails.get(String(id)) || null;
    },
    getLocalLikedTracks: () => overrides.localLikedTracks || [],
    prefetchNeteaseSongUrls: (...args) => calls.push(["prefetch", ...args]),
    sleep: async () => calls.push(["sleep"]),
    warn: (...args) => calls.push(["warn", ...args]),
    ...overrides.deps
  });
  return { service, calls, kv };
}

{
  const { service } = createService();
  assert.equal(service.getStoredNeteaseUserId(), "uid-1");
  assert.deepEqual(service.extractRemotePlaylistTrackIds({ playlist: { trackIds: [{ id: 1 }, 2] } }), ["1", "2"]);
  assert.deepEqual(service.extractRemotePlaylistTrackIds({ songs: [{ id: 3 }, { songId: 4 }] }), ["3", "4"]);
}

{
  const { service, calls } = createService({ likedIds: ["100"] });
  const result = await service.syncRemoteLikeState("100", true);
  assert.deepEqual(result, { code: 200 });
  assert.deepEqual(calls.slice(0, 3).map((call) => call[1]), ["/like", undefined, "/likelist"]);
  assert.equal(calls[0][3].method, "POST");
}

{
  const { service, calls } = createService({
    requestImpl: async (pathname, params) => {
      if (pathname === "/playlist/detail") return { playlist: { trackIds: [{ id: "10" }, { id: "20" }] } };
      return { code: 200, params };
    }
  });
  const result = await service.syncRemotePlaylistTracks({ playlistId: "p1", songIds: ["10", "10", "20"], op: "add" });
  assert.deepEqual(result, { code: 200, params: { op: "add", pid: "p1", tracks: "10,20" } });
  assert.equal(calls[0][1], "/playlist/tracks");
  assert.equal(calls[0][2].tracks, "10,20");
  assert.equal(calls[2][1], "/playlist/detail");
}

{
  const { service, calls, kv } = createService();
  const synced = await service.syncNeteaseUserPlaylists();
  assert.equal(synced.loggedIn, true);
  assert.equal(JSON.parse(kv.get("netease.profile")).nickname, "DJ");
  assert.deepEqual(calls.filter((call) => call[0] === "upsertPlaylist").map((call) => call[1].displayOrder), [-100000, 1]);
  assert.deepEqual(calls.filter((call) => call[0] === "upsertPlaylist").map((call) => call[1].ownerUserId), ["uid-1", "uid-1"]);
  assert.deepEqual(calls.find((call) => call[0] === "getLocalNeteasePlaylists"), ["getLocalNeteasePlaylists", { ownerUserId: "uid-1" }]);
}

{
  const { service, calls } = createService({
    localDetails: { liked: { id: "local-liked", displayOrder: -100000 } },
    localLikedTracks: [{ id: "track-3", sourceId: "3", title: "Local liked" }]
  });
  const playlist = await service.syncNeteasePlaylistDetail("liked");
  assert.equal(playlist.sourceId, "liked");
  assert.equal(playlist.ownerUserId, "uid-1");
  const replaced = calls.find((call) => call[0] === "replaceTracks");
  assert.deepEqual(replaced[2].map((track) => track.sourceId), ["1", "2", "3"]);
  assert.equal(calls.find((call) => call[0] === "prefetch")[2], "standard");
}

{
  const { service } = createService({
    localPlaylists: [
      { sourceId: "cached", trackCount: 2 },
      { sourceId: "missing", trackCount: 2 },
      { id: "no-source" }
    ],
    localDetails: {
      cached: { tracks: [{}, {}], trackCount: 2 },
      missing: { tracks: [], trackCount: 2 }
    }
  });
  assert.deepEqual(await service.syncAllNeteasePlaylistDetails(), { synced: 1, skipped: 1, total: 3 });
}

{
  const { service } = createService({
    deps: {
      syncAllNeteasePlaylistDetails: async () => ({ synced: 1 })
    }
  });
  const first = service.scheduleNeteaseFullSync();
  const second = service.scheduleNeteaseFullSync();
  assert.equal(first, second);
  assert.deepEqual(await first, { synced: 1 });
}

console.log("netease-remote-sync-service tests passed");
