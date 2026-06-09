import assert from "node:assert/strict";
import { registerNeteasePlaylistRoutes } from "../src/server/routes/netease-playlist-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const router = createRouter();
  const deps = {
    getStoredNeteaseProfile: () => ({ userId: 1, nickname: "Local" }),
    getLocalNeteasePlaylists: () => [{ id: "p1", sourceId: "p1", title: "本地歌单", displayOrder: 1, tracks: [] }],
    hasNeteaseLoginCookie: () => true,
    scheduleNeteaseFullSync: (options) => calls.push(["schedule", options || {}]),
    syncNeteaseUserPlaylists: async () => ({ loggedIn: true, playlists: [] }),
    syncNeteasePlaylistDetail: async (id) => ({ id, title: "remote", tracks: [] }),
    getLocalNeteasePlaylistDetail: (id) => ({ id, title: "local detail", description: "desc", tracks: [{ id: "t1" }] }),
    mapNeteaseTracksWithUrls: async (tracks, options) => {
      calls.push(["mapTracks", options]);
      return tracks.map((track) => ({ ...track, mapped: true }));
    },
    isGenericPlaylistDescription: () => false,
    refreshNeteasePlaylistMetadata: async (playlist) => playlist,
    warn: (message) => calls.push(["warn", message]),
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerNeteasePlaylistRoutes(router, deps);
  return { router, sent, calls };
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/playlists")
  });
  assert.deepEqual(sent, [{
    status: 200,
    payload: {
      ok: true,
      loggedIn: true,
      cookieReady: true,
      profile: { userId: 1, nickname: "Local" },
      playlists: [{ id: "p1", sourceId: "p1", title: "本地歌单", displayOrder: 1, tracks: [] }],
      source: "local-cache"
    }
  }]);
  assert.deepEqual(calls, [["schedule", {}]]);
}

{
  const detailCalls = [];
  const { router, sent, calls } = createHarness({
    getLocalNeteasePlaylists: () => [{ id: "cached", sourceId: "cached", displayOrder: 0 }],
    syncNeteaseUserPlaylists: async () => ({
      loggedIn: true,
      playlists: [{ id: "liked", sourceId: "liked-source", title: "我喜欢的音乐", displayOrder: -1 }]
    }),
    syncNeteasePlaylistDetail: async (id) => {
      detailCalls.push(id);
      return { id, title: "synced", tracks: [] };
    }
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/playlists?refresh=1")
  });
  assert.deepEqual(detailCalls, ["liked-source"]);
  assert.deepEqual(sent[0].payload.source, "netease");
  assert.deepEqual(calls, [["schedule", { force: true }]]);
}

{
  const { router, sent } = createHarness({
    hasNeteaseLoginCookie: () => true,
    getStoredNeteaseProfile: () => ({ userId: 9, nickname: "Cached" }),
    getLocalNeteasePlaylists: () => [{ id: "cached", sourceId: "cached", displayOrder: 1, tracks: [] }],
    syncNeteaseUserPlaylists: async () => ({
      loggedIn: false,
      profile: null,
      playlists: []
    })
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/playlists?refresh=1")
  });
  assert.equal(sent[0].payload.loggedIn, true);
  assert.equal(sent[0].payload.cookieReady, true);
  assert.deepEqual(sent[0].payload.profile, { userId: 9, nickname: "Cached" });
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/playlist")
  });
  assert.deepEqual(sent, [{ status: 400, payload: { error: "Playlist id is required" } }]);
}

{
  const { router, sent, calls } = createHarness({
    getLocalNeteasePlaylistDetail: (id) => ({ id, title: "fallback", description: "desc", tracks: [{ id: "t1" }] }),
    syncNeteasePlaylistDetail: async () => {
      throw new Error("remote down");
    }
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/playlist?id=p1&refresh=1&urls=1")
  });
  assert.equal(sent[0].status, 200);
  assert.equal(sent[0].payload.source, "local-cache");
  assert.deepEqual(sent[0].payload.playlist.tracks, [{ id: "t1", mapped: true }]);
  assert.deepEqual(calls.at(-1), ["mapTracks", { includeUrls: true }]);
}

{
  const { router, sent } = createHarness({
    getLocalNeteasePlaylistDetail: () => null,
    syncNeteasePlaylistDetail: async () => {
      throw new Error("remote down");
    }
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/playlist?id=missing")
  });
  assert.deepEqual(sent.at(-1), {
    status: 404,
    payload: { ok: false, error: "本地没有保存这个歌单，且网易云暂时不可用。" }
  });
}

console.log("netease-playlist-routes tests passed");
