import assert from "node:assert/strict";
import { createRouter } from "../src/server/router.js";

const calls = [];
const router = createRouter();
router.get("/api/health", async (context) => {
  calls.push(["health", context.url.pathname]);
  context.res.statusCode = 200;
});
router.post("/api/media/preload", (context) => {
  calls.push(["preload", context.req.method]);
  context.res.statusCode = 202;
});
router.getPrefix("/api/cache/voice/", (context) => {
  calls.push(["voice", context.pathTail]);
  context.res.statusCode = 200;
});

const healthRes = {};
assert.equal(await router.handle({
  req: { method: "GET" },
  res: healthRes,
  url: new URL("http://localhost/api/health")
}), true);
assert.equal(healthRes.statusCode, 200);

const preloadRes = {};
assert.equal(await router.handle({
  req: { method: "POST" },
  res: preloadRes,
  url: new URL("http://localhost/api/media/preload")
}), true);
assert.equal(preloadRes.statusCode, 202);

assert.equal(await router.handle({
  req: { method: "GET" },
  res: {},
  url: new URL("http://localhost/api/missing")
}), false);

const voiceRes = {};
assert.equal(await router.handle({
  req: { method: "GET" },
  res: voiceRes,
  url: new URL("http://localhost/api/cache/voice/sample.mp3")
}), true);
assert.equal(voiceRes.statusCode, 200);

assert.deepEqual(calls, [["health", "/api/health"], ["preload", "POST"], ["voice", "sample.mp3"]]);

console.log("router tests passed");
