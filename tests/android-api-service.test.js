import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  createClaudeCapabilityServer,
  createRuntimeConfig,
  normalizeLocation,
  parseEnvFileContent
} = require("../android-node/api-service.js");

assert.deepEqual(parseEnvFileContent("OPENAI_API_KEY=sk-test\n# nope\nOPENAI_MODEL='deepseek-chat'"), {
  OPENAI_API_KEY: "sk-test",
  OPENAI_MODEL: "deepseek-chat"
});
assert.deepEqual(normalizeLocation({ latitude: 31.23456, longitude: 121.4737 }), {
  lat: 31.23456,
  lon: 121.4737,
  qweatherLocation: "121.47,31.23"
});
assert.equal(normalizeLocation({ lat: 91, lon: 1 }), null);

{
  const bundledRoot = await mkdtemp(path.join(os.tmpdir(), "claude-fm-android-env-"));
  const differentWorkingDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-android-cwd-"));
  await writeFile(
    path.join(bundledRoot, "claudio-runtime.env"),
    "OPENAI_API_KEY=sk-runtime\nQWEATHER_API_KEY=qw-runtime\nWEATHER_CITY=上海\n"
  );
  const config = createRuntimeConfig(differentWorkingDir, path.join(bundledRoot, "settings.json"), bundledRoot);
  assert.equal(config.openaiKey, "sk-runtime");
  assert.equal(config.qweatherApiKey, "qw-runtime");
  assert.equal(config.weatherCity, "上海");
}

function createReq(method, url, body = null) {
  const listeners = {};
  return {
    method,
    url,
    setEncoding() {},
    on(event, callback) {
      listeners[event] = callback;
      if (event === "end") {
        if (body !== null && listeners.data) listeners.data(JSON.stringify(body));
        callback();
      }
    }
  };
}

function createRes() {
  return {
    status: 0,
    headers: null,
    body: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body || "";
    }
  };
}

const calls = [];
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "claude-fm-android-api-"));
const envSnapshot = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  QWEATHER_API_KEY: process.env.QWEATHER_API_KEY,
  OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY
};
delete process.env.OPENAI_API_KEY;
delete process.env.QWEATHER_API_KEY;
delete process.env.OPENWEATHER_API_KEY;
const service = createClaudeCapabilityServer({
  rootDir: tempRoot,
  settingsPath: path.join(tempRoot, "settings.json"),
  request: async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/v7/weather/now")) {
      return { code: "200", now: { text: "晴", temp: "26", humidity: "58" } };
    }
    if (options?.headers?.["api-key"]) {
      return { choices: [{ message: { audio: { data: Buffer.from("mimo-audio").toString("base64") } } }] };
    }
    return { choices: [{ message: { content: "DeepSeek reply" } }] };
  },
  createServer: (handler) => ({ handler, listen() {} })
});
Object.assign(process.env, Object.fromEntries(Object.entries(envSnapshot).filter(([, value]) => value !== undefined)));

{
  const res = createRes();
  await service.handler(createReq("GET", "/api/weather?lat=31.23&lon=121.47"), res);
  assert.equal(res.status, 200);
  assert.equal(JSON.parse(res.body).weather.tempC, 24);
}

{
  const res = createRes();
  await service.handler(createReq("POST", "/api/chat", { message: "hi", track: { title: "Song" } }), res);
  const payload = JSON.parse(res.body);
  assert.equal(res.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.message.content.length > 0, true);
  assert.notEqual(res.body.trim().startsWith("<!doctype html>"), true);
}

{
  const tempRootForGarbled = await mkdtemp(path.join(os.tmpdir(), "claude-fm-android-garbled-"));
  const garbledService = createClaudeCapabilityServer({
    rootDir: tempRootForGarbled,
    settingsPath: path.join(tempRootForGarbled, "settings.json"),
    request: async (url) => {
      if (String(url).includes("/v7/weather/now")) {
        return { code: "200", now: { text: "多云", temp: "24", humidity: "58" } };
      }
      return { choices: [{ message: { content: "??D?!should????:NoNoD:??? ThisJ§NOHost房????(SOh!?!?No?NoNoNo?!nNo" } }] };
    },
    createServer: (handler) => ({ handler, listen() {} })
  });
  const settingsRes = createRes();
  await garbledService.handler(createReq("POST", "/api/settings", { openaiKey: "sk-test" }), settingsRes);
  const res = createRes();
  await garbledService.handler(createReq("POST", "/api/chat", { message: "你好", track: { title: "Song" } }), res);
  const payload = JSON.parse(res.body);
  assert.equal(payload.provider, "local-fallback");
  assert.match(payload.replyError, /unreadable text/);
  assert.doesNotMatch(payload.message.content, /\?\?D/);
}

{
  calls.length = 0;
  const res = createRes();
  await service.handler(createReq("POST", "/api/settings", {
    mimoTtsKey: "mk",
    mimoTtsModel: "mimo-v2.5-tts",
    mimoTtsFormat: "mp3",
    mimoTtsVoice: "冰糖"
  }), res);
  assert.equal(res.status, 200);

  const voiceRes = createRes();
  await service.handler(createReq("POST", "/api/voice", { text: "Say it", voiceSettings: { preset: "冰糖" } }), voiceRes);
  const voice = JSON.parse(voiceRes.body);
  assert.equal(voiceRes.status, 200);
  assert.equal(voice.ok, true);
  assert.equal(voice.provider, "mimo");
  assert.equal(voice.mimeType, "audio/mpeg");
  assert.match(voice.audioUrl, /^data:audio\/mpeg;base64,/);
  assert.equal(calls.at(-1).options.headers["api-key"], "mk");
}

console.log("android api service tests passed");
