import assert from "node:assert/strict";
import { registerContextRoutes } from "../src/server/routes/context-routes.js";
import { createRouter } from "../src/server/router.js";

const calls = [];
const sent = [];
const router = createRouter();

registerContextRoutes(router, {
  getWeatherLocationFromSearch: (searchParams) => {
    calls.push(["location", searchParams.get("lat"), searchParams.get("lon")]);
    return { lat: Number(searchParams.get("lat")), lon: Number(searchParams.get("lon")) };
  },
  buildNowPayload: async () => ({}),
  getWeather: async (location) => {
    calls.push(["weather", location]);
    return { summary: "多云", tempC: 24, location };
  },
  getSchedule: async () => [],
  getTrackById: () => ({ id: "track-1" }),
  getTimeBlock: () => "evening",
  getInsightForTrack: async () => ({ insight: null, insightError: null }),
  normalizeWeatherLocation: (location) => location,
  getCurrentIndex: () => 0,
  getTrackCount: () => 1,
  prewarmQueue: async () => [],
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => sent.push({ status, payload })
});

await router.handle({
  req: { method: "GET" },
  res: {},
  url: new URL("http://localhost/api/weather?lat=31.23&lon=121.47")
});

assert.equal(sent[0].status, 200);
assert.deepEqual(sent[0].payload, {
  ok: true,
  weather: { summary: "多云", tempC: 24, location: { lat: 31.23, lon: 121.47 } }
});
assert.deepEqual(calls, [
  ["location", "31.23", "121.47"],
  ["weather", { lat: 31.23, lon: 121.47 }]
]);

console.log("context weather route tests passed");
