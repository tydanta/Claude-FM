import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { envKeyMap, runtimeConfigKeys } from "../src/server/config.js";
import { createRuntimeSettingsService } from "../src/server/runtime-settings-service.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-settings-"));

try {
  await writeFile(path.join(tempDir, ".env"), [
    "# local settings",
    "OPENAI_API_KEY=old-key",
    "OPENAI_BASE_URL=https://old.example.com",
    "QWEATHER_API_HOST=https://old.weather/",
    "NO_SEPARATOR",
    ""
  ].join("\n"), "utf8");

  const cleared = [];
  const config = {
    mimoTtsKey: "mimo-secret",
    mimoTtsModel: "mimo-v2.5-tts",
    mimoVoiceDesignModel: "mimo-v2.5-tts-voicedesign",
    openaiBaseUrl: "https://api.old.com",
    openaiChatPath: "/v1/chat/completions",
    openaiKey: "openai-secret",
    openaiModel: "gpt-old",
    remoteCapabilityBaseUrl: "https://remote.example.com",
    qweatherApiKey: "weather-secret",
    qweatherApiHost: "devapi.qweather.com",
    qweatherLocation: "101020100",
    weatherCity: "Shanghai",
    neteaseAudioLevel: "higher"
  };

  const service = createRuntimeSettingsService({
    config,
    rootDir: tempDir,
    runtimeConfigKeys,
    envKeyMap,
    normalizeNeteaseAudioLevel: (level) => `level:${String(level || "").trim().toLowerCase()}`,
    clearInsightCache: () => cleared.push("insight")
  });

  assert.equal(service.maskSecret(""), "");
  assert.equal(service.maskSecret("abcd"), "ab****cd");
  assert.equal(service.maskSecret("openai-secret"), "open****cret");
  assert.equal(service.secretFingerprint(""), "");
  assert.equal(service.secretFingerprint("openai-secret").length, 12);

  assert.equal(service.getEditableSettings().openaiKey, "open****cret");
  assert.equal(service.getEditableSettings().mimoTtsKey, "mimo****cret");
  assert.equal(service.getEditableSettings({ revealSecrets: true }).openaiKey, "openai-secret");
  assert.equal(service.getEditableSettings().neteaseAudioLevel, "level:higher");

  assert.equal(service.normalizeRuntimeSetting("openaiBaseUrl", " https://api.deepseek.com/ "), "https://api.deepseek.com");
  assert.equal(service.normalizeRuntimeSetting("remoteCapabilityBaseUrl", " https://fm.example.com/ "), "https://fm.example.com");
  assert.equal(service.normalizeRuntimeSetting("qweatherApiHost", "https://devapi.qweather.com/"), "devapi.qweather.com");
  assert.equal(service.normalizeRuntimeSetting("neteaseAudioLevel", " HiRes "), "level:hires");
  assert.equal(service.normalizeRuntimeSetting("openaiModel", " gpt-4.1 "), "gpt-4.1");

  const updated = await service.saveRuntimeSettings({
    openaiKey: "",
    openaiBaseUrl: " https://api.deepseek.com/ ",
    openaiModel: " gpt-4.1 ",
    remoteCapabilityBaseUrl: " https://fm.example.com/ ",
    qweatherApiHost: "https://devapi.qweather.com/",
    weatherCity: "",
    neteaseAudioLevel: " LossLess "
  });

  assert.equal(config.openaiKey, "openai-secret");
  assert.equal(config.openaiBaseUrl, "https://api.deepseek.com");
  assert.equal(config.openaiChatPath, "/chat/completions");
  assert.equal(config.openaiModel, "gpt-4.1");
  assert.equal(config.remoteCapabilityBaseUrl, "https://fm.example.com");
  assert.equal(config.qweatherApiHost, "devapi.qweather.com");
  assert.equal(config.weatherCity, "Shanghai");
  assert.equal(config.neteaseAudioLevel, "level:lossless");
  assert.equal(updated.openaiKey, "open****cret");
  assert.deepEqual(cleared, ["insight"]);

  const envText = await readFile(path.join(tempDir, ".env"), "utf8");
  assert.match(envText, /^# local settings/m);
  assert.match(envText, /^OPENAI_API_KEY=old-key/m);
  assert.match(envText, /^OPENAI_BASE_URL=https:\/\/api\.deepseek\.com/m);
  assert.match(envText, /^QWEATHER_API_HOST=devapi\.qweather\.com/m);
  assert.match(envText, /^REMOTE_CAPABILITY_BASE_URL=https:\/\/fm\.example\.com/m);
  assert.match(envText, /^OPENAI_MODEL=gpt-4\.1/m);
  assert.match(envText, /^NETEASE_AUDIO_LEVEL=level:lossless/m);
  assert.match(envText, /^NO_SEPARATOR/m);

  await service.saveRuntimeSettings({ qweatherLocation: "101010100" });
  assert.deepEqual(cleared, ["insight"]);
  assert.equal(config.qweatherLocation, "101010100");
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("runtime-settings-service tests passed");
