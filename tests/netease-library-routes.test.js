import assert from "node:assert/strict";
import { registerNeteaseLibraryRoutes } from "../src/server/routes/netease-library-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const router = createRouter();
  const deps = {
    getKv: () => JSON.stringify({ userId: "uid-1" }),
    neteaseRequest: async (pathname, params, options) => {
      calls.push(["request", pathname, params, options]);
      return { ids: ["1", "2"] };
    },
    parseBody: async (req) => req.body,
    normalizePlaybackTrack: (track, fallback) => ({ ...track, sourceId: track?.sourceId || fallback.sourceTrackId || "normalized", source: fallback.source }),
    upsertTrack: (track) => calls.push(["upsert", track]),
    updateLocalLikeState: (id, like) => {
      calls.push(["localLike", id, like]);
      return { id, like };
    },
    syncRemoteLikeState: async (id, like) => ({ code: 200, id, like }),
    enqueueSyncJob: (type, payload) => calls.push(["enqueue", type, payload]),
    getLocalLikedNeteasePlaylist: () => ({ id: "liked" }),
    getLocalNeteasePlaylists: () => [{ id: "liked" }, { id: "p1" }],
    updateLocalPlaylistTracks: (payload) => {
      calls.push(["localPlaylist", payload]);
      return { changed: true, payload };
    },
    syncRemotePlaylistTracks: async (payload) => ({ code: 200, payload }),
    getLocalNeteasePlaylistDetail: (id) => ({ id, tracks: [{ id: "t1" }] }),
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerNeteaseLibraryRoutes(router, deps);
  return { router, sent, calls };
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/like/list")
  });
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, ids: ["1", "2"] } }]);
  assert.deepEqual(calls[0], ["request", "/likelist", { uid: "uid-1" }, { auth: true }]);
}

{
  const { router, sent } = createHarness({
    getKv: () => "null"
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/like/list")
  });
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, ids: [] } }]);
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "POST", body: {} },
    res: {},
    url: new URL("http://localhost/api/netease/like")
  });
  assert.deepEqual(sent, [{ status: 400, payload: { error: "Song id is required" } }]);
}

{
  const { router, sent, calls } = createHarness({
    syncRemoteLikeState: async () => {
      throw new Error("remote down");
    }
  });
  await router.handle({
    req: { method: "POST", body: { id: "100", like: false, track: { title: "Song" } } },
    res: {},
    url: new URL("http://localhost/api/netease/like")
  });
  assert.deepEqual(calls.find((call) => call[0] === "upsert"), ["upsert", { title: "Song", sourceId: "100", source: "netease" }]);
  assert.deepEqual(calls.find((call) => call[0] === "localLike"), ["localLike", "100", false]);
  assert.deepEqual(calls.find((call) => call[0] === "enqueue"), ["enqueue", "netease.like", { id: "100", like: false }]);
  assert.equal(sent[0].payload.pendingSync, true);
  assert.deepEqual(sent[0].payload.likedPlaylist, { id: "liked" });
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "POST", body: { playlistId: "", songIds: [] } },
    res: {},
    url: new URL("http://localhost/api/netease/playlist/tracks")
  });
  assert.deepEqual(sent, [{ status: 400, payload: { error: "playlistId and songIds are required" } }]);
}

{
  const { router, sent, calls } = createHarness({
    syncRemotePlaylistTracks: async () => {
      throw new Error("remote down");
    }
  });
  await router.handle({
    req: {
      method: "POST",
      body: {
        playlistId: "p1",
        songIds: ["10", "20"],
        op: "del",
        placement: "prepend",
        tracks: [{ sourceId: "10", title: "A" }, { sourceId: "20", title: "B" }]
      }
    },
    res: {},
    url: new URL("http://localhost/api/netease/playlist/tracks")
  });
  assert.deepEqual(calls.filter((call) => call[0] === "upsert").map((call) => call[1].sourceId), ["10", "20"]);
  assert.deepEqual(calls.find((call) => call[0] === "localPlaylist"), [
    "localPlaylist",
    { playlistId: "p1", songIds: ["10", "20"], op: "del", placement: "prepend", ownerUserId: "uid-1" }
  ]);
  assert.deepEqual(calls.find((call) => call[0] === "enqueue"), ["enqueue", "netease.playlist.del", { playlistId: "p1", songIds: "10,20", op: "del", placement: "prepend" }]);
  assert.equal(sent[0].payload.pendingSync, true);
  assert.deepEqual(sent[0].payload.playlist, { id: "p1", tracks: [{ id: "t1" }] });
}

console.log("netease-library-routes tests passed");
