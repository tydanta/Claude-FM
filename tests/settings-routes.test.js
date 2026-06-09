import assert from "node:assert/strict";
import { registerSettingsRoutes } from "../src/server/routes/settings-routes.js";
import { createRouter } from "../src/server/router.js";

const sent = [];
const router = createRouter();
registerSettingsRoutes(router, {
  getEditableSettings: ({ revealSecrets = false } = {}) => ({ revealSecrets, openaiKey: revealSecrets ? "secret" : "****" }),
  saveRuntimeSettings: async (body) => ({ saved: body.openaiModel }),
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => sent.push({ status, payload })
});

await router.handle({ req: { method: "GET" }, res: {}, url: new URL("http://localhost/api/settings?reveal=1") });
await router.handle({ req: { method: "POST", body: { openaiModel: "gpt" } }, res: {}, url: new URL("http://localhost/api/settings") });

assert.deepEqual(sent, [
  { status: 200, payload: { ok: true, settings: { revealSecrets: true, openaiKey: "secret" } } },
  { status: 200, payload: { ok: true, settings: { saved: "gpt" } } }
]);

console.log("settings-routes tests passed");
