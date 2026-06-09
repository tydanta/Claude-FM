import assert from "node:assert/strict";
import { registerBackgroundRoutes } from "../src/server/routes/background-routes.js";
import { createRouter } from "../src/server/router.js";

const sent = [];
const router = createRouter();
registerBackgroundRoutes(router, {
  getNorthernSettings: () => ({ mode: "dark", imageUrl: "" }),
  saveNorthernSettings: (body) => ({ mode: body.mode, imageUrl: "" }),
  saveNorthernBackgroundImage: async (body) => {
    if (body.fail) {
      const error = new Error("bad image");
      error.statusCode = 400;
      throw error;
    }
    return { mode: "custom", imageUrl: "/api/background/image/a.png" };
  },
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => sent.push({ status, payload })
});

await router.handle({ req: { method: "GET" }, res: {}, url: new URL("http://localhost/api/background") });
await router.handle({ req: { method: "POST", body: { mode: "light" } }, res: {}, url: new URL("http://localhost/api/background") });
await router.handle({ req: { method: "POST", body: { image: "data" } }, res: {}, url: new URL("http://localhost/api/background/upload") });
await router.handle({ req: { method: "POST", body: { fail: true } }, res: {}, url: new URL("http://localhost/api/background/upload") });

assert.deepEqual(sent, [
  { status: 200, payload: { ok: true, background: { mode: "dark", imageUrl: "" } } },
  { status: 200, payload: { ok: true, background: { mode: "light", imageUrl: "" } } },
  { status: 200, payload: { ok: true, background: { mode: "custom", imageUrl: "/api/background/image/a.png" } } },
  { status: 400, payload: { ok: false, error: "bad image" } }
]);

console.log("background-routes tests passed");
