import assert from "node:assert/strict";
import { registerContextRoutes } from "../src/server/routes/context-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const router = createRouter();
  const deps = {
    getWeatherLocationFromSearch: (params) => ({ city: params.get("city") || "上海" }),
    buildNowPayload: async (options) => {
      calls.push(["now", options]);
      return { ok: true, now: options };
    },
    getWeather: async (location) => {
      calls.push(["weather", location]);
      return { text: "sunny" };
    },
    getSchedule: async () => {
      calls.push(["schedule"]);
      return [{ title: "focus" }];
    },
    getTrackById: (id) => ({ id: id || "current", title: "Track" }),
    getTimeBlock: () => "morning",
    getInsightForTrack: async (track, weather, schedule, timeBlock, options) => {
      calls.push(["insight", track, weather, schedule, timeBlock, options]);
      return { insight: "hello", insightError: "" };
    },
    normalizeWeatherLocation: (location) => ({ normalized: location || "default" }),
    getCurrentIndex: () => 2,
    getTrackCount: () => 5,
    prewarmQueue: async (options) => {
      calls.push(["prewarm", options]);
      return [{ id: "warm" }];
    },
    parseBody: async (req) => req.body,
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerContextRoutes(router, deps);
  return { router, sent, calls };
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/now?insight=0&city=北京")
  });
  assert.deepEqual(calls, [["now", { includeInsight: false, location: { city: "北京" } }]]);
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, now: { includeInsight: false, location: { city: "北京" } } } }]);
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "GET" },
    res: {},
    url: new URL("http://localhost/api/insight?trackId=t1&voiceLanguage=zh&city=杭州")
  });
  assert.deepEqual(calls.find((call) => call[0] === "insight"), [
    "insight",
    { id: "t1", title: "Track" },
    { text: "sunny" },
    [{ title: "focus" }],
    "morning",
    { voiceLanguage: "zh" }
  ]);
  assert.deepEqual(sent, [{
    status: 200,
    payload: { ok: true, trackId: "t1", insight: "hello", insightError: "", insightPending: false }
  }]);
}

{
  const { router, sent, calls } = createHarness();
  await router.handle({
    req: { method: "POST", body: { location: "深圳", startIndex: 7, limit: 9 } },
    res: {},
    url: new URL("http://localhost/api/prewarm")
  });
  assert.deepEqual(calls, [["prewarm", { startIndex: 2, limit: 9, location: { normalized: "深圳" } }]]);
  assert.deepEqual(sent, [{ status: 200, payload: { ok: true, warmed: [{ id: "warm" }] } }]);
}

{
  const { router, calls } = createHarness();
  await router.handle({
    req: { method: "POST", body: { location: null, limit: "4" } },
    res: {},
    url: new URL("http://localhost/api/prewarm")
  });
  assert.deepEqual(calls, [["prewarm", { startIndex: 2, limit: 4, location: { normalized: "default" } }]]);
}

console.log("context-routes tests passed");
