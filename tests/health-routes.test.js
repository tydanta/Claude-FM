import assert from "node:assert/strict";
import { createRouter } from "../src/server/router.js";
import { registerHealthRoutes } from "../src/server/routes/health-routes.js";

const sent = [];
const router = createRouter();
registerHealthRoutes(router, {
  config: {
    cacheDir: "data/cache",
    openaiBaseUrl: "https://openai.example",
    openaiChatPath: "/v1/chat/completions",
    openaiModel: "gpt",
    insightPromptVersion: "v1",
    openaiKey: "key",
    mimoTtsKey: "",
    mimoChatEnabled: false,
    anthropicKey: "",
    anthropicModel: "claude",
    mimoChatModel: "mimo-chat",
    piperEnabled: false,
    fishAudioKey: "",
    fishAudioReferenceId: "",
    mimoTtsVoice: "voice",
    mimoTtsModel: "tts",
    insightCacheTtlHours: 24,
    voiceCacheTtlHours: 24
  },
  getIntegrations: () => ({ netease: true }),
  getCacheStats: async () => ({ insight: { count: 1 }, voice: { count: 2 }, media: { cover: { count: 3 } } }),
  sendJson: (res, status, payload) => sent.push({ res, status, payload }),
  now: () => new Date("2026-06-03T00:00:00.000Z")
});

await router.handle({ req: { method: "GET" }, res: {}, url: new URL("http://localhost/api/health") });
assert.equal(sent[0].status, 200);
assert.equal(sent[0].payload.ok, true);
assert.equal(sent[0].payload.time, "2026-06-03T00:00:00.000Z");
assert.deepEqual(sent[0].payload.integrations, { netease: true });

await router.handle({ req: { method: "GET" }, res: {}, url: new URL("http://localhost/api/capabilities") });
assert.equal(sent[1].status, 200);
assert.equal(sent[1].payload.models.insight.enabled, true);
assert.deepEqual(sent[1].payload.cache.media, { cover: { count: 3 } });

console.log("health-routes tests passed");
