import assert from "node:assert/strict";
import { createInsightRuntimeService } from "../src/server/insight-runtime-service.js";

const tracks = [
  { id: "track-1", title: "First", artist: "A" },
  { id: "track-2", title: "Second", artist: "B" },
  { id: "track-3", title: "Third", artist: "C" }
];

function createService(overrides = {}) {
  const calls = [];
  const insightCache = new Map();
  const state = {
    currentIndex: 0,
    preferences: { focus: "steady" }
  };
  const deps = {
    config: {
      openaiBaseUrl: "https://api.example.test",
      openaiModel: "model-a",
      openaiKey: "key-a"
    },
    state,
    tracks,
    insightCache,
    secretFingerprint: (value) => `fp:${value}`,
    getInsightCacheKey: (payload) => {
      calls.push(["cacheKey", payload.track.id, payload.voiceLanguage, payload.keyFingerprint]);
      return `disk-${payload.track.id}-${payload.voiceLanguage || "default"}`;
    },
    readCachedInsight: async (key) => {
      calls.push(["readCache", key]);
      return null;
    },
    writeCachedInsight: async (key, payload) => {
      calls.push(["writeCache", key, payload.insight.provider]);
      return payload;
    },
    askOpenAIForInsight: async (context) => {
      calls.push(["openai", context.track.id, context.preferences.focus, context.voiceLanguage]);
      return {
        provider: "openai",
        english: ["Hello voice.", "Second paragraph."],
        chinese: ["你好。"]
      };
    },
    mockInsight: (track) => ({ provider: "mock", english: [`fallback ${track.id}`], chinese: [] }),
    mockChineseInsight: (track) => ({ provider: "mock", english: [], chinese: [`fallback ${track.id}`] }),
    sanitizeVoiceText: (text) => String(text || "").replace(/\s+/g, " ").trim(),
    synthesizeVoice: async (text) => {
      calls.push(["voice", text]);
      return { provider: "mimo", cached: text.includes("Second"), audioUrl: `/voice/${text}.wav` };
    },
    getWeather: async (location) => {
      calls.push(["weather", location]);
      return { summary: "sunny", tempC: 28 };
    },
    getSchedule: async () => {
      calls.push(["schedule"]);
      return [{ title: "work" }];
    },
    getTimeBlock: () => "morning",
    ...overrides
  };
  return { service: createInsightRuntimeService(deps), calls, insightCache, state };
}

{
  const { service, calls, insightCache } = createService();
  const weather = { summary: "sunny", tempC: 28 };
  const schedule = [{ title: "work" }];
  const first = await service.getInsightForTrack(tracks[0], weather, schedule, "morning", { voiceLanguage: "en" });
  const second = await service.getInsightForTrack(tracks[0], weather, schedule, "morning", { voiceLanguage: "en" });
  assert.equal(first, second);
  assert.equal(insightCache.size, 1);
  assert.equal(first.insight.provider, "openai");
  assert.deepEqual(calls.filter((call) => call[0] === "openai"), [["openai", "track-1", "steady", "en"]]);
  assert.deepEqual(calls.filter((call) => call[0] === "writeCache"), [["writeCache", "disk-track-1-en", "openai"]]);
}

{
  const { service, calls } = createService({
    readCachedInsight: async (key) => {
      calls.push(["readCache", key]);
      return { insight: { provider: "openai", english: ["Cached."], chinese: [] }, insightError: null };
    }
  });
  const payload = await service.getInsightForTrack(tracks[0], { summary: "rain", tempC: 20 }, [], "night");
  assert.equal(payload.insight.cached, true);
  assert.equal(calls.some((call) => call[0] === "openai"), false);
}

{
  const { service } = createService({
    askOpenAIForInsight: async () => {
      throw new Error("quota");
    }
  });
  const payload = await service.getInsightForTrack(tracks[1], { summary: "rain", tempC: 20 }, [], "night");
  assert.equal(payload.insight.provider, "mock-fallback");
  assert.equal(payload.insight.error, "quota");
  assert.equal(payload.insightError, "quota");
}

{
  const { service, calls } = createService({
    synthesizeVoice: async (text) => {
      calls.push(["voice", text]);
      if (text.includes("Second")) throw new Error("voice failed");
      return { provider: "mimo", cached: false, audioUrl: "/voice.wav" };
    }
  });
  const warmed = await service.warmTrackAssets(tracks[0], { summary: "sunny", tempC: 28 }, [], "morning");
  assert.equal(warmed.trackId, "track-1");
  assert.equal(warmed.insightReady, true);
  assert.equal(warmed.voice.length, 2);
  assert.deepEqual(warmed.voice.map((item) => item.ready), [true, false]);
  assert.equal(warmed.voice[1].reason, "voice failed");
}

{
  const { service } = createService({
    warmTrackAssets: async (track) => {
      if (track.id === "track-2") throw new Error("warm failed");
      return { trackId: track.id, insightReady: true, voice: [] };
    }
  });
  const warmed = await service.prewarmQueue({ startIndex: 0, limit: 3, location: { city: "Shanghai" } });
  assert.deepEqual(warmed, [
    { trackId: "track-2", insightReady: false, voice: [], error: "warm failed" },
    { trackId: "track-3", insightReady: true, voice: [] },
    { trackId: "track-1", insightReady: true, voice: [] }
  ]);
}

console.log("insight-runtime-service tests passed");
