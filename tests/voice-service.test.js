import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createVoiceService } from "../src/server/voice-service.js";

const tmpRoot = await mkdir(path.join(os.tmpdir(), "claude-fm-voice-service-"), { recursive: true });
await rm(tmpRoot, { recursive: true, force: true });
await mkdir(tmpRoot, { recursive: true });

function createService(overrides = {}) {
  const calls = [];
  const config = {
    fishAudioKey: "",
    fishAudioReferenceId: "",
    fishAudioModel: "fish-model",
    mimoTtsBaseUrl: "https://mimo.example.test/v1",
    mimoTtsFormat: "wav",
    mimoTtsKey: "",
    mimoTtsModel: "mimo-tts",
    mimoTtsStyle: "warm style",
    mimoTtsVoice: "冰糖",
    mimoVoiceDesignModel: "mimo-design",
    piperCommand: "piper",
    piperEnabled: false,
    piperVoice: "voice.onnx",
    ...overrides.config
  };
  const service = createVoiceService({
    config,
    rootDir: tmpRoot,
    voiceCacheDir: overrides.voiceCacheDir || path.join(tmpRoot, "voice-cache"),
    mimoAdapter: {
      async chatCompletion(payload, options) {
        calls.push(["mimo", payload, options]);
        return overrides.mimoResponse || {
          choices: [{ message: { audio: { data: Buffer.from("mimo-audio").toString("base64") } } }]
        };
      }
    },
    fetchImpl: async (url, options) => {
      calls.push(["fetch", url, options]);
      return overrides.fetchResponse || {
        ok: true,
        async arrayBuffer() {
          return Buffer.from("fish-audio");
        },
        async text() {
          return "";
        }
      };
    },
    existsImpl: overrides.existsImpl,
    runProcess: overrides.runProcess || (async () => Buffer.from("pcm")),
    writeFileImpl: overrides.writeFileImpl,
    mkdirImpl: overrides.mkdirImpl
  });
  return { service, calls, config };
}

{
  const { service } = createService();
  assert.deepEqual(service.normalizeVoiceSettings({}), {
    mode: "preset",
    model: "mimo-tts",
    voice: "冰糖",
    prompt: ""
  });
  assert.deepEqual(service.normalizeVoiceSettings({ customPrompt: "  whisper close  " }), {
    mode: "custom",
    model: "mimo-design",
    voice: "whisper close",
    prompt: "whisper close"
  });
}

{
  const { service } = createService();
  const first = service.getVoiceCacheKey("hello", { preset: "冰糖" });
  const changedText = service.getVoiceCacheKey("hello again", { preset: "冰糖" });
  const changedVoice = service.getVoiceCacheKey("hello", { preset: "茉莉" });
  assert.notEqual(first, changedText);
  assert.notEqual(first, changedVoice);
}

{
  const voiceCacheDir = path.join(tmpRoot, "cache-hit");
  const { service } = createService({ voiceCacheDir });
  const key = service.getVoiceCacheKey("cached text");
  const { fileName, filePath } = service.getVoiceCachePaths(key, "audio/wav");
  await mkdir(voiceCacheDir, { recursive: true });
  await writeFile(filePath, "wav");
  assert.deepEqual(await service.readCachedVoice("cached text"), {
    provider: "cache",
    text: "cached text",
    audioUrl: `/api/cache/voice/${fileName}`,
    mimeType: "audio/wav",
    reason: null,
    cached: true
  });
}

{
  const voiceCacheDir = path.join(tmpRoot, "cache-mp3");
  const { service } = createService({ voiceCacheDir });
  const key = service.getVoiceCacheKey("cached mp3");
  const { fileName, filePath } = service.getVoiceCachePaths(key, "audio/mpeg");
  await mkdir(voiceCacheDir, { recursive: true });
  await writeFile(filePath, "mp3");
  const cached = await service.readCachedVoice("cached mp3");
  assert.equal(cached.audioUrl, `/api/cache/voice/${fileName}`);
  assert.equal(cached.mimeType, "audio/mpeg");
}

{
  const { service } = createService({ config: { piperEnabled: false } });
  assert.equal(await service.synthesizeWithPiper("hello"), null);
}

{
  const { service } = createService({ config: { fishAudioKey: "", fishAudioReferenceId: "" } });
  const result = await service.synthesizeVoice("  hello  ");
  assert.deepEqual(result, {
    provider: "browser",
    text: "hello",
    audioUrl: null,
    mimeType: null,
    reason: "missing-api-key"
  });
}

{
  const { service } = createService({ config: { fishAudioKey: "fk", fishAudioReferenceId: "" } });
  const result = await service.synthesizeVoice("hello");
  assert.equal(result.reason, "missing-reference-id");
}

{
  const voiceCacheDir = path.join(tmpRoot, "mimo-cache");
  const { service, calls } = createService({
    voiceCacheDir,
    config: { mimoTtsKey: "mk", mimoTtsFormat: "mp3" }
  });
  const result = await service.synthesizeVoice("hello");
  assert.equal(result.provider, "mimo");
  assert.equal(result.mimeType, "audio/mpeg");
  assert.match(result.audioUrl, /^\/api\/cache\/voice\/.+\.mp3$/);
  assert.equal(result.cached, false);
  assert.equal(calls[0][0], "mimo");
}

await rm(tmpRoot, { recursive: true, force: true });
console.log("voice-service tests passed");
