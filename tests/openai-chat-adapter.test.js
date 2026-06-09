import assert from "node:assert/strict";
import { createOpenAIChatAdapter } from "../src/server/openai-chat-adapter.js";

const calls = [];
const adapter = createOpenAIChatAdapter({
  getUrl: () => "https://api.example/chat/completions",
  getApiKey: () => "sk-test",
  fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: "你好，继续听这首。" } }] })
    };
  }
});

const content = await adapter.createChatCompletion({
  model: "model-a",
  temperature: 0.5,
  messages: [{ role: "user", content: "hi" }]
});
assert.equal(content, "你好，继续听这首。");
assert.equal(calls[0].url, "https://api.example/chat/completions");
assert.equal(calls[0].options.headers.authorization, "Bearer sk-test");
assert.deepEqual(JSON.parse(calls[0].options.body), {
  model: "model-a",
  temperature: 0.5,
  messages: [{ role: "user", content: "hi" }]
});

const raw = await adapter.createChatCompletionRaw({
  model: "model-a",
  messages: [{ role: "user", content: "json" }],
  response_format: { type: "json_object" }
});
assert.deepEqual(raw, { choices: [{ message: { content: "你好，继续听这首。" } }] });

let attempts = 0;
const retryAdapter = createOpenAIChatAdapter({
  getUrl: () => "https://api.example/chat/completions",
  getApiKey: () => "sk-test",
  retryDelayMs: 1,
  fetchImpl: async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("network down");
    return { ok: true, json: async () => ({ choices: [{ message: { content: "after retry" } }] }) };
  }
});
assert.equal(await retryAdapter.createChatCompletion({ model: "m", messages: [] }), "after retry");
assert.equal(attempts, 2);

let emptyAttempts = 0;
const emptyRetryAdapter = createOpenAIChatAdapter({
  getUrl: () => "https://api.example/chat/completions",
  getApiKey: () => "sk-test",
  retryDelayMs: 1,
  fetchImpl: async () => {
    emptyAttempts += 1;
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: emptyAttempts === 1 ? "" : "not empty" } }]
      })
    };
  }
});
assert.equal(await emptyRetryAdapter.createChatCompletion({ model: "m", messages: [] }), "not empty");
assert.equal(emptyAttempts, 2);

const failingAdapter = createOpenAIChatAdapter({
  getUrl: () => "https://api.example/chat/completions",
  getApiKey: () => "sk-test",
  fetchImpl: async () => ({ ok: false, status: 401, text: async () => "bad key" })
});
await assert.rejects(
  () => failingAdapter.createChatCompletion({ model: "m", messages: [] }),
  /OpenAI-compatible chat failed: 401 bad key/
);

console.log("openai-chat-adapter tests passed");
