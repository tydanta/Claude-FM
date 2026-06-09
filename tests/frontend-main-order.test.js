import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve(import.meta.dirname, "../public/modules/main.js"), "utf8");

const preloadQueueIndex = source.indexOf("preloadQueueInsights,");
const controllerIndex = source.indexOf("const preloadController = createPreloadController");
const localUpcomingTracksIndex = source.indexOf("function getUpcomingTracks(");
const insightControllerIndex = source.indexOf("const insightController = createInsightController");

assert.ok(preloadQueueIndex > 0, "main.js should receive preloadQueueInsights from insightController");
assert.ok(controllerIndex > preloadQueueIndex, "preload controller must be created after preloadQueueInsights exists");
assert.ok(localUpcomingTracksIndex > 0, "main.js should keep a local getUpcomingTracks for insight startup");
assert.ok(
  insightControllerIndex > localUpcomingTracksIndex,
  "insight controller must be created after local getUpcomingTracks exists"
);

console.log("frontend-main-order tests passed");
