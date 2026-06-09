import assert from "node:assert/strict";
import { registerMediaRoutes } from "../src/server/routes/media-routes.js";
import { createRouter } from "../src/server/router.js";

const calls = [];
const sent = [];
const router = createRouter();
registerMediaRoutes(router, {
  mediaCache: {
    serveCover: async (req, res, url) => calls.push(["cover", url.searchParams.get("url")]),
    serveAudio: async (req, res, url) => calls.push(["audio", url.searchParams.get("songId")]),
    preloadCovers: async (body) => ({ covers: body.items.length }),
    preloadAudio: async (body) => ({ audio: body.items.length })
  },
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => sent.push({ status, payload })
});

await router.handle({ req: { method: "GET" }, res: {}, url: new URL("http://localhost/api/media/cover?url=cover.jpg") });
await router.handle({ req: { method: "GET" }, res: {}, url: new URL("http://localhost/api/media/audio?songId=100") });
await router.handle({ req: { method: "POST", body: { items: [{ url: "a" }, { url: "b" }] } }, res: {}, url: new URL("http://localhost/api/media/preload-covers") });
await router.handle({ req: { method: "POST", body: { items: [{ songId: "1" }] } }, res: {}, url: new URL("http://localhost/api/media/preload-audio") });

assert.deepEqual(calls, [["cover", "cover.jpg"], ["audio", "100"]]);
assert.deepEqual(sent, [
  { status: 200, payload: { covers: 2 } },
  { status: 200, payload: { audio: 1 } }
]);

console.log("media-routes tests passed");
