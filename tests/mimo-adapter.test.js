import assert from "node:assert/strict";
import { createMimoAdapter } from "../src/server/mimo-adapter.js";

const calls = [];
const adapter = createMimoAdapter({
  config: { mimoTtsBaseUrl: "https://mimo.example", mimoTtsKey: "mimo-key" },
  fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "reply", audio: { data: "abc" } } }] })
    };
  }
});

const payload = { model: "m", messages: [{ role: "user", content: "hi" }] };
assert.deepEqual(await adapter.chatCompletion(payload), {
  choices: [{ message: { content: "reply", audio: { data: "abc" } } }]
});
assert.equal(calls[0].url, "https://mimo.example/chat/completions");
assert.equal(calls[0].options.headers["api-key"], "mimo-key");
assert.deepEqual(JSON.parse(calls[0].options.body), payload);

const failingAdapter = createMimoAdapter({
  config: { mimoTtsBaseUrl: "https://mimo.example", mimoTtsKey: "mimo-key" },
  fetchImpl: async () => ({ ok: false, status: 429, text: async () => "slow down" })
});
await assert.rejects(
  () => failingAdapter.chatCompletion(payload),
  /MiMo chat failed: 429 slow down/
);

let fallbackPayload = null;
const fallbackAdapter = createMimoAdapter({
  config: { mimoTtsBaseUrl: "https://mimo.example", mimoTtsKey: "mimo-key" },
  fetchImpl: async () => {
    throw new Error("fetch unavailable");
  },
  platform: "win32",
  fallback: async (body) => {
    fallbackPayload = body;
    return { ok: true };
  }
});
assert.deepEqual(await fallbackAdapter.chatCompletion(payload), { ok: true });
assert.deepEqual(fallbackPayload, payload);

console.log("mimo-adapter tests passed");
