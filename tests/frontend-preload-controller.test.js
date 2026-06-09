import assert from "node:assert/strict";
import { createPreloadController } from "../public/modules/player/preloadController.js";

const prefetched = [];
const audioPreloads = [];
const coverPreloads = [];
const serverCalls = [];
const timers = [];
const preload = createPreloadController({
  api: (path, options) => {
    serverCalls.push({ path, options });
    return Promise.resolve();
  },
  getCurrentIndex: () => 0,
  getPlayMode: () => "order",
  getDjModeEnabled: () => true,
  getWeatherBody: (body) => ({ ...body, location: { lat: 1, lon: 2 } }),
  neteaseApi: {
    prefetchSongUrls(items) {
      prefetched.push(items);
      return Promise.resolve();
    }
  },
  preloadNeteaseAudio: (tracks, limit, options) => audioPreloads.push({ tracks, limit, options }),
  preloadNeteaseCoverSlice: (tracks, options) => coverPreloads.push({ tracks, options }),
  buildCoverPreloadPlan: () => [
    { target: "list", start: 0, items: 2, priority: "high" },
    { target: "list", start: 2, items: 2, priority: "low" }
  ],
  shouldPreloadMoreCovers: () => true,
  setTimeoutFn(callback, delay) {
    timers.push({ callback, delay });
    return timers.length;
  }
});

const queue = [
  { id: "a", source: "netease", sourceId: "1" },
  { id: "b", source: "netease", sourceId: "2" },
  { id: "c", source: "netease", sourceId: "3" },
  { id: "d", source: "netease", sourceId: "4" }
];

preload.prewarmNeteaseUrls(queue, 10);
assert.deepEqual(prefetched[0].map((item) => item.sourceId), ["1", "2", "3"]);
assert.equal(audioPreloads[0].limit, 3);
assert.equal(typeof audioPreloads[0].options.api, "function");

preload.prewarmVisibleCovers(queue, "list");
assert.equal(coverPreloads.length, 2);
assert.equal(coverPreloads[0].options.priority, "high");
assert.equal(typeof coverPreloads[0].options.api, "function");

const scroller = { dataset: {}, scrollTop: 900, clientHeight: 200, scrollHeight: 1000 };
preload.prewarmMoreCoversOnScroll(scroller, Array.from({ length: 60 }, (_, index) => ({ id: String(index) })), "list");
assert.equal(scroller.dataset.coverPreloadOffset, "60");

preload.prewarmServerQueue(queue);
assert.equal(timers[0].delay, 900);
timers[0].callback();
assert.equal(serverCalls[0].path, "/api/prewarm");
assert.match(serverCalls[0].options.body, /"limit":3/);
assert.match(serverCalls[0].options.body, /"location"/);

{
  const localServerCalls = [];
  const localTimers = [];
  const localPreload = createPreloadController({
    api: (path, options) => {
      localServerCalls.push({ path, options });
      return Promise.resolve();
    },
    getCurrentIndex: () => 0,
    getPlayMode: () => "order",
    getDjModeEnabled: () => true,
    getWeatherBody: (body) => body,
    neteaseApi: { prefetchSongUrls: async () => ({}) },
    preloadNeteaseAudio: () => {},
    preloadNeteaseCoverSlice: () => {},
    buildCoverPreloadPlan: () => [],
    shouldPreloadMoreCovers: () => false,
    isLocalPreloadRuntime: () => true,
    setTimeoutFn(callback, delay) {
      localTimers.push({ callback, delay });
    }
  });

  localPreload.prewarmServerQueue(queue);
  assert.deepEqual(localTimers, []);
  assert.deepEqual(localServerCalls, []);
}

console.log("frontend-preload-controller tests passed");
