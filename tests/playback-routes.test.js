import assert from "node:assert/strict";
import { registerPlaybackRoutes } from "../src/server/routes/playback-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const state = {
    isPlaying: false,
    currentIndex: 1,
    volume: 0.5,
    speed: 1,
    preferences: { focus: "steady" }
  };
  const router = createRouter();
  const deps = {
    state,
    getTrackCount: () => 4,
    readPlaybackState: () => ({ trackId: "t1", position: 12 }),
    savePlaybackState: (payload) => calls.push(["savePlayback", payload]),
    savePersistedState: async () => calls.push(["saveState"]),
    normalizeWeatherLocation: (location) => ({ normalized: location || "default" }),
    buildNowPayload: async (options) => {
      calls.push(["now", options]);
      return { ok: true, now: options, currentIndex: state.currentIndex };
    },
    parseBody: async (req) => req.body,
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerPlaybackRoutes(router, deps);
  return { router, sent, calls, state };
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/playback")
  });
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, playback: { trackId: "t1", position: 12 } } }]);
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "POST", body: { trackId: "t2", position: 9 } },
    res: {},
    url: new URL("http://localhost/api/playback")
  });
  assert.deepEqual(calls, [["savePlayback", { trackId: "t2", position: 9 }]]);
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, playback: { trackId: "t1", position: 12 } } }]);
}

{
  const { router, sent, calls, state } = createHarness();
  await router.handle({
    req: { method: "POST", body: { isPlaying: true, volume: 0.8, speed: 1.25, ignored: "x" } },
    res: {},
    url: new URL("http://localhost/api/state")
  });
  assert.deepEqual(calls, [["saveState"]]);
  assert.equal(state.isPlaying, true);
  assert.equal(state.volume, 0.8);
  assert.equal(state.speed, 1.25);
  assert.deepEqual(sent[0], { status: 200, payload: state });
}

{
  const { router, sent, calls, state } = createHarness();
  await router.handle({
    req: { method: "POST", body: { location: "杭州" } },
    res: {},
    url: new URL("http://localhost/api/next")
  });
  assert.equal(state.currentIndex, 2);
  assert.equal(state.isPlaying, true);
  assert.deepEqual(calls, [["saveState"], ["now", { includeInsight: false, location: { normalized: "杭州" } }]]);
  assert.equal(sent[0].payload.currentIndex, 2);
}

{
  const { router, sent, state } = createHarness();
  state.currentIndex = 0;
  await router.handle({
    req: { method: "POST", body: {} },
    res: {},
    url: new URL("http://localhost/api/previous")
  });
  assert.equal(state.currentIndex, 3);
  assert.equal(sent[0].payload.currentIndex, 3);
}

{
  const { router, sent, state } = createHarness();
  await router.handle({
    req: { method: "POST", body: { index: 99 } },
    res: {},
    url: new URL("http://localhost/api/select")
  });
  assert.equal(state.currentIndex, 1);
  assert.deepEqual(sent, [{ status: 400, payload: { error: "Invalid track index" } }]);
}

{
  const { router, sent, state } = createHarness();
  await router.handle({
    req: { method: "POST", body: { index: 3, location: "成都" } },
    res: {},
    url: new URL("http://localhost/api/select")
  });
  assert.equal(state.currentIndex, 3);
  assert.equal(state.isPlaying, true);
  assert.equal(sent[0].payload.currentIndex, 3);
}

{
  const { router, sent, state, calls } = createHarness();
  await router.handle({
    req: { method: "POST", body: { night: "soft" } },
    res: {},
    url: new URL("http://localhost/api/taste")
  });
  assert.deepEqual(state.preferences, { focus: "steady", night: "soft" });
  assert.deepEqual(calls, [["saveState"]]);
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, preferences: { focus: "steady", night: "soft" } } }]);
}

console.log("playback-routes tests passed");
