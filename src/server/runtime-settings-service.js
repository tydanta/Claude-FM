import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

export function createRuntimeSettingsService({
  config,
  rootDir,
  runtimeConfigKeys,
  envKeyMap,
  normalizeNeteaseAudioLevel,
  clearInsightCache = () => {}
}) {
  function maskSecret(value = "") {
    const text = String(value || "");
    if (!text) return "";
    if (text.length <= 8) return `${text.slice(0, 2)}****${text.slice(-2)}`;
    return `${text.slice(0, 4)}****${text.slice(-4)}`;
  }

  function secretFingerprint(value = "") {
    const text = String(value || "");
    if (!text) return "";
    return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
  }

  function getEditableSettings({ revealSecrets = false } = {}) {
    return {
      mimoTtsKey: revealSecrets ? config.mimoTtsKey : maskSecret(config.mimoTtsKey),
      mimoTtsModel: config.mimoTtsModel,
      mimoVoiceDesignModel: config.mimoVoiceDesignModel,
      openaiBaseUrl: config.openaiBaseUrl,
      openaiKey: revealSecrets ? config.openaiKey : maskSecret(config.openaiKey),
      openaiModel: config.openaiModel,
      remoteCapabilityBaseUrl: config.remoteCapabilityBaseUrl,
      qweatherApiKey: revealSecrets ? config.qweatherApiKey : maskSecret(config.qweatherApiKey),
      qweatherApiHost: config.qweatherApiHost,
      qweatherLocation: config.qweatherLocation,
      weatherCity: config.weatherCity,
      neteaseAudioLevel: normalizeNeteaseAudioLevel(config.neteaseAudioLevel)
    };
  }

  function normalizeRuntimeSetting(key, value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    if (key === "openaiBaseUrl") return text.replace(/\/$/, "");
    if (key === "remoteCapabilityBaseUrl") return text.replace(/\/$/, "");
    if (key === "qweatherApiHost") return text.replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (key === "neteaseAudioLevel") return normalizeNeteaseAudioLevel(text);
    return text;
  }

  async function updateEnvFile(updates) {
    const envPath = path.join(rootDir, ".env");
    const existing = existsSync(envPath) ? await readFile(envPath, "utf8") : "";
    const lines = existing ? existing.split(/\r?\n/) : [];
    const updatedEnvKeys = new Set();
    const nextLines = lines.map((line) => {
      const separator = line.indexOf("=");
      if (separator === -1 || line.trim().startsWith("#")) return line;
      const key = line.slice(0, separator).trim();
      const configKey = Object.entries(envKeyMap).find(([, envKey]) => envKey === key)?.[0];
      if (!configKey || !(configKey in updates)) return line;
      updatedEnvKeys.add(key);
      return `${key}=${updates[configKey]}`;
    });
    for (const [configKey, value] of Object.entries(updates)) {
      const envKey = envKeyMap[configKey];
      if (envKey && !updatedEnvKeys.has(envKey)) {
        nextLines.push(`${envKey}=${value}`);
      }
    }
    await writeFile(envPath, nextLines.join("\n").replace(/\n*$/, "\n"), "utf8");
  }

  async function saveRuntimeSettings(body = {}) {
    const updates = {};
    for (const key of runtimeConfigKeys) {
      if (!(key in body)) continue;
      const value = normalizeRuntimeSetting(key, body[key]);
      if (!value && /Key$/.test(key)) continue;
      if (!value) continue;
      updates[key] = value;
    }
    Object.assign(config, updates);
    if ("openaiBaseUrl" in updates && !("openaiChatPath" in updates)) {
      config.openaiChatPath = config.openaiBaseUrl.includes("api.deepseek.com")
        ? "/chat/completions"
        : "/v1/chat/completions";
    }
    if (Object.keys(updates).length) {
      await updateEnvFile(updates);
    }
    if (["openaiKey", "openaiBaseUrl", "openaiModel"].some((key) => key in updates)) {
      clearInsightCache();
    }
    return getEditableSettings();
  }

  return {
    maskSecret,
    secretFingerprint,
    getEditableSettings,
    normalizeRuntimeSetting,
    updateEnvFile,
    saveRuntimeSettings
  };
}
