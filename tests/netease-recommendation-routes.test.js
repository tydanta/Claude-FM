import assert from "node:assert/strict";
import { registerNeteaseRecommendationRoutes } from "../src/server/routes/netease-recommendation-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const router = createRouter();
  const deps = {
    config: { neteaseAudioLevel: "standard" },
    normalizeDailyRecommendDate: (value) => value === "yesterday" ? "2026-06-02" : (value === "today" || !value ? "2026-06-03" : value),
    getLocalDateKey: () => "2026-06-03",
    getLocalDailyRecommendations: (date) => [{ sourceId: `${date}-local-1` }, { sourceId: `${date}-local-2` }],
    getDailyRecommendPlaylistMeta: (date, songs) => ({ id: `daily-${date}`, count: songs.length }),
    neteaseRequest: async (pathname, params, options) => {
      calls.push(["request", pathname, params, options]);
      if (pathname === "/recommend/songs") return { data: { dailySongs: [{ id: "r1", name: "Remote 1" }, { id: "r2", name: "Remote 2" }] } };
      if (pathname === "/personal_fm") return { data: [{ id: "fm1", name: "FM 1" }] };
      if (pathname === "/playmode/intelligence/list") return { data: [{ songInfo: { id: "h1", name: "Heart 1" } }, { song: { id: "h2", name: "Heart 2" } }] };
      return {};
    },
    normalizeNeteaseTrack: (song) => ({ sourceId: String(song.id), title: song.name }),
    replaceDailyRecommendations: (date, songs) => {
      calls.push(["replaceDaily", date, songs]);
      return songs.map((song) => ({ ...song, stored: true }));
    },
    prefetchNeteaseSongUrls: (ids, level, limit) => calls.push(["prefetch", ids, level, limit]),
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerNeteaseRecommendationRoutes(router, deps);
  return { router, sent, calls };
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/recommend/songs?date=yesterday&local=1&limit=1")
  });
  assert.deepEqual(sent, [{
    status: 200,
    payload: {
      ok: true,
      date: "2026-06-02",
      source: "local",
      songs: [{ sourceId: "2026-06-02-local-1" }],
      playlist: { id: "daily-2026-06-02", count: 1 }
    }
  }]);
  assert.deepEqual(calls, []);
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/recommend/songs?limit=1")
  });
  assert.equal(sent[0].payload.source, "remote");
  assert.deepEqual(sent[0].payload.songs, [{ sourceId: "r1", title: "Remote 1", stored: true }]);
  assert.deepEqual(calls.find((call) => call[0] === "replaceDaily"), ["replaceDaily", "2026-06-03", [{ sourceId: "r1", title: "Remote 1" }]]);
  assert.deepEqual(calls.find((call) => call[0] === "prefetch"), ["prefetch", ["r1"], "standard", 3]);
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
    url: new URL("http://localhost/api/netease/recommend/songs?limit=2")
  });
  assert.equal(sent[0].payload.source, "local");
  assert.equal(sent[0].payload.offline, true);
  assert.equal(sent[0].payload.ok, true);
  assert.equal(sent[0].payload.songs.length, 2);
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/personal-fm")
  });
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, songs: [{ sourceId: "fm1", title: "FM 1" }] } }]);
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/heartbeat")
  });
  assert.deepEqual(sent, [{ status: 400, payload: { error: "id is required" } }]);
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/netease/heartbeat?id=100&pid=p1&limit=200")
  });
  assert.deepEqual(calls.find((call) => call[0] === "request"), [
    "request",
    "/playmode/intelligence/list",
    { id: "100", songId: "100", startMusicId: "100", limit: 100, pid: "p1", playlistId: "p1" },
    { auth: true }
  ]);
  assert.deepEqual(calls.find((call) => call[0] === "prefetch"), ["prefetch", ["h1", "h2"], "standard", 4]);
  assert.deepEqual(sent[0], { status: 200, payload: { ok: true, songs: [{ sourceId: "h1", title: "Heart 1" }, { sourceId: "h2", title: "Heart 2" }] } });
}

console.log("netease-recommendation-routes tests passed");
