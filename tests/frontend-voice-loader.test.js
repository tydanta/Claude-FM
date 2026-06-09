import assert from "node:assert/strict";
import { createVoiceLoader } from "../public/modules/chat/voiceLoader.js";

class FakeAudio {
  constructor() {
    this.preload = "";
    this.src = "";
  }

  load() {
    this.onloadedmetadata?.();
  }
}

function createLoader(overrides = {}) {
  const calls = [];
  const loader = createVoiceLoader({
    api: async (path, options) => {
      calls.push([path, options]);
      return overrides.apiResult || { provider: "mimo", audioUrl: "/voice.wav", mimeType: "audio/wav" };
    },
    fetchImpl: async (url) => {
      calls.push(["fetch", url]);
      return { blob: async () => ({ url }) };
    },
    resolveApiAssetUrl: (url) => `/asset${url}`,
    createObjectUrl: (blob) => `blob:${blob.url}`,
    AudioCtor: FakeAudio,
    getVoiceSettings: () => overrides.voiceSettings || { preset: "冰糖", language: "zh" }
  });
  return { calls, loader };
}

{
  const { calls, loader } = createLoader();
  const result = await loader.getVoiceForText("  你好\u00A0Claudio  ");

  assert.equal(result.audioUrl, "blob:/asset/voice.wav");
  assert.equal(result.originalAudioUrl, "/voice.wav");
  assert.equal(calls[0][0], "/api/voice");
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    text: "你好 Claudio",
    voiceSettings: { preset: "冰糖", language: "zh" }
  });
  assert.deepEqual(calls[1], ["fetch", "/asset/voice.wav"]);
}

{
  const { calls, loader } = createLoader();
  const first = loader.getVoiceForText("same");
  const second = loader.getVoiceForText("same");

  await Promise.all([first, second]);
  assert.equal(calls.filter(([name]) => name === "/api/voice").length, 1);
}

{
  const { calls, loader } = createLoader();
  const result = await loader.getPreparedVoiceFromUrl("/direct.wav", "audio/mpeg", "chat:1");

  assert.equal(result.provider, "mimo");
  assert.equal(result.mimeType, "audio/mpeg");
  assert.equal(result.cached, true);
  assert.equal(result.audioUrl, "blob:/asset/direct.wav");
  assert.deepEqual(calls[0], ["fetch", "/asset/direct.wav"]);
}

{
  const loader = createVoiceLoader({
    api: async () => ({ provider: "browser" }),
    fetchImpl: async () => ({ blob: async () => ({}) }),
    AudioCtor: FakeAudio
  });

  await assert.rejects(() => loader.getVoiceForText("fail"), /Voice provider fallback: browser/);
  assert.equal(loader.voiceCache.size, 0);
}

console.log("frontend-voice-loader tests passed");
