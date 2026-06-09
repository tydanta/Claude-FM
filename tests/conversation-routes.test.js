import assert from "node:assert/strict";
import { registerConversationRoutes } from "../src/server/routes/conversation-routes.js";
import { createRouter } from "../src/server/router.js";

function createHarness(overrides = {}) {
  const sent = [];
  const calls = [];
  const state = {
    currentIndex: 0,
    preferences: { focus: "steady" },
    messages: [{ role: "system", content: "ready" }, { role: "user", content: "old" }]
  };
  const tracks = [{ id: "track-1", title: "Track 1", reason: "warm", mood: "calm" }];
  const router = createRouter();
  const deps = {
    config: { anthropicKey: "ak", openaiKey: "", mimoTtsKey: "mk" },
    state,
    getCurrentTrack: () => tracks[state.currentIndex],
    normalizeWeatherLocation: (location) => ({ normalized: location || "default" }),
    getWeather: async (location) => {
      calls.push(["weather", location]);
      return { summary: "sunny" };
    },
    getSchedule: async () => {
      calls.push(["schedule"]);
      return [{ title: "focus" }];
    },
    getTrackById: (id) => ({ id, title: `Track ${id}` }),
    askClaudeForChat: async (context) => {
      calls.push(["chat", context]);
      return "reply";
    },
    fallbackChatReply: (context, reason) => {
      calls.push(["fallback", reason, context.message]);
      return `fallback:${reason}`;
    },
    synthesizeVoice: async (text, settings) => {
      calls.push(["voice", text, settings]);
      return { provider: "mimo", text, audioUrl: "/audio.wav", mimeType: "audio/wav" };
    },
    parseBody: async (req) => req.body,
    warn: (...args) => calls.push(["warn", ...args]),
    now: () => "2026-06-03T00:00:00.000Z",
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    ...overrides
  };
  registerConversationRoutes(router, deps);
  return { router, sent, calls, state };
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "POST", body: { message: "   " } },
    res: {},
    url: new URL("http://localhost/api/chat")
  });
  assert.deepEqual(sent, [{ status: 400, payload: { error: "Message is required" } }]);
}

{
  const { router, sent, calls, state } = createHarness();
  await router.handle({
    req: { method: "POST", body: { message: "hello", location: "杭州", preferences: { night: "soft" }, voiceSettings: { preset: "A" } } },
    res: {},
    url: new URL("http://localhost/api/chat")
  });
  assert.equal(sent[0].status, 200);
  assert.equal(sent[0].payload.provider, "claude");
  assert.equal(sent[0].payload.message.content, "reply");
  assert.equal(sent[0].payload.history.length, 3);
  assert.equal(state.messages.at(-1).content, "reply");
  assert.deepEqual(calls.find((call) => call[0] === "voice"), ["voice", "reply", { preset: "A" }]);
  assert.equal(calls.find((call) => call[0] === "chat")[1].preferences.night, "soft");
}

{
  const { router, sent, calls } = createHarness({
    config: { anthropicKey: "", openaiKey: "ok", mimoTtsKey: "" },
    askClaudeForChat: async () => {
      throw new Error("model down");
    }
  });
  await router.handle({
    req: { method: "POST", body: { message: "help", track: { id: "manual", title: "Manual Track" } } },
    res: {},
    url: new URL("http://localhost/api/chat")
  });
  assert.equal(sent[0].payload.provider, "local-fallback");
  assert.equal(sent[0].payload.replyError, "model down");
  assert.equal(sent[0].payload.track.title, "Manual Track");
  assert.deepEqual(calls.find((call) => call[0] === "fallback").slice(0, 2), ["fallback", "model down"]);
}

{
  const { router, sent } = createHarness();
  await router.handle({
    req: { method: "POST", body: { text: "Say it", voiceSettings: { preset: "B" } } },
    res: {},
    url: new URL("http://localhost/api/voice")
  });
  assert.deepEqual(sent, [{
    status: 200,
    payload: { ok: true, provider: "mimo", text: "Say it", audioUrl: "/audio.wav", mimeType: "audio/wav" }
  }]);
}

{
  const { router, sent } = createHarness({
    synthesizeVoice: async () => {
      throw new Error("tts down");
    }
  });
  await router.handle({
    req: { method: "POST", body: { text: "No audio" } },
    res: {},
    url: new URL("http://localhost/api/voice")
  });
  assert.deepEqual(sent, [{
    status: 503,
    payload: { ok: false, provider: "none", text: "No audio", audioUrl: null, mimeType: null, reason: "tts down" }
  }]);
}

{
  const { router, sent } = createHarness({
    synthesizeVoice: async () => {
      throw new Error("tts down");
    }
  });
  await router.handle({
    req: { method: "POST", body: { text: "Browser fallback", requireAudio: false } },
    res: {},
    url: new URL("http://localhost/api/voice")
  });
  assert.deepEqual(sent, [{
    status: 200,
    payload: { ok: true, provider: "browser", text: "Browser fallback", audioUrl: null, mimeType: null, reason: "tts down" }
  }]);
}

console.log("conversation-routes tests passed");
