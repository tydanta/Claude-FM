import assert from "node:assert/strict";
import { registerNeteaseDiscoveryRoutes } from "../src/server/routes/netease-discovery-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const router = createRouter();
  const deps = {
    neteaseRequest: async (pathname, params, options) => {
      calls.push(["request", pathname, params, options]);
      if (pathname === "/search" && params.type === "100") return { result: { artists: [{ id: "artist-1", name: params.keywords }] } };
      if (pathname === "/search") return {
        result: {
          songs: [{ id: "song-1", name: "Song" }],
          playlists: [{ id: "playlist-1" }],
          artists: [{ id: "artist-1" }],
          hasMore: true
        }
      };
      if (pathname === "/artist/detail") return { data: { artist: { id: params.id, name: "Remote Artist" } } };
      if (pathname === "/artist/songs") return { songs: [{ id: "song-2", name: "Artist Song" }] };
      if (pathname === "/artist/album") return { hotAlbums: [{ id: "album-1" }] };
      if (pathname === "/album") return { album: { id: params.id, name: "Remote Album", picUrl: "album.jpg" }, songs: [{ id: "song-3", name: "Album Song" }] };
      return {};
    },
    normalizeNeteaseTrack: (song) => ({ sourceId: String(song.id), title: song.name, normalized: true }),
    upsertTrack: (track) => calls.push(["upsert", track]),
    getLocalNeteaseTrackSearch: (keywords, limit) => [{ sourceId: "local-1", title: `${keywords}-${limit}` }],
    getLocalNeteaseArtistPage: (query) => ({ artist: { id: query.id || "local", name: query.name || "Local Artist" }, songs: [], albums: [] }),
    warn: (...args) => calls.push(["warn", ...args]),
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerNeteaseDiscoveryRoutes(router, deps);
  return { router, sent, calls };
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/search?keywords=%20%20")
  });
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, songs: [], playlists: [], artists: [] } }]);
  assert.deepEqual(calls, []);
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/search?keywords=hello&limit=10&offset=5")
  });
  assert.deepEqual(sent[0].payload, {
    ok: true,
    offline: false,
    source: "netease",
    songs: [{ sourceId: "song-1", title: "Song", normalized: true }],
    hasMore: true,
    playlists: [{ id: "playlist-1" }],
    artists: [{ id: "artist-1" }]
  });
  assert.deepEqual(calls.find((call) => call[0] === "upsert"), ["upsert", { sourceId: "song-1", title: "Song", normalized: true }]);
}

{
  const { router, sent } = createHarness({
    neteaseRequest: async () => {
      throw new Error("remote down");
    }
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/search?keywords=cache&limit=2")
  });
  assert.deepEqual(sent[0].payload, {
    ok: true,
    offline: true,
    source: "local-cache",
    songs: [{ sourceId: "local-1", title: "cache-2" }],
    hasMore: false,
    playlists: [],
    artists: []
  });
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/artist?name=Jay")
  });
  assert.equal(sent[0].status, 200);
  assert.equal(sent[0].payload.source, "netease");
  assert.equal(sent[0].payload.artistId, "artist-1");
  assert.deepEqual(sent[0].payload.songs, [{ sourceId: "song-2", title: "Artist Song", normalized: true }]);
  assert.deepEqual(calls.filter((call) => call[0] === "request").map((call) => call[1]), ["/search", "/artist/detail", "/artist/songs", "/artist/album"]);
}

{
  const { router, sent } = createHarness({
    neteaseRequest: async () => ({}),
    getLocalNeteaseArtistPage: ({ id, name }) => ({ artist: { id: id || "local", name: name || "Cached" }, songs: [{ sourceId: "s" }], albums: [] })
  });
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/artist?id=missing&name=Cached")
  });
  assert.deepEqual(sent[0], {
    status: 200,
    payload: {
      ok: true,
      offline: true,
      source: "local-cache",
      artist: { id: "missing", name: "Cached" },
      songs: [{ sourceId: "s" }],
      albums: []
    }
  });
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/album?id=album-1")
  });
  assert.equal(sent[0].status, 200);
  assert.equal(sent[0].payload.source, "netease");
  assert.equal(sent[0].payload.album.name, "Remote Album");
  assert.deepEqual(sent[0].payload.tracks, [{ sourceId: "song-3", title: "Album Song", normalized: true }]);
  assert.deepEqual(calls.filter((call) => call[0] === "request").map((call) => call[1]), ["/album"]);
}

console.log("netease-discovery-routes tests passed");
