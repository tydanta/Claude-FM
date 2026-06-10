import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const runtimeConfigKeys = new Set([
  "mimoTtsKey",
  "mimoTtsBaseUrl",
  "mimoTtsModel",
  "mimoVoiceDesignModel",
  "openaiBaseUrl",
  "openaiKey",
  "openaiModel",
  "remoteCapabilityBaseUrl",
  "qweatherApiKey",
  "qweatherApiHost",
  "qweatherLocation",
  "weatherCity",
  "neteaseAudioLevel"
]);

export const envKeyMap = {
  mimoTtsKey: "MIMO_TTS_API_KEY",
  mimoTtsBaseUrl: "MIMO_TTS_BASE_URL",
  mimoTtsModel: "MIMO_TTS_MODEL",
  mimoVoiceDesignModel: "MIMO_VOICE_DESIGN_MODEL",
  openaiBaseUrl: "OPENAI_BASE_URL",
  openaiKey: "OPENAI_API_KEY",
  openaiModel: "OPENAI_MODEL",
  remoteCapabilityBaseUrl: "REMOTE_CAPABILITY_BASE_URL",
  qweatherApiKey: "QWEATHER_API_KEY",
  qweatherApiHost: "QWEATHER_API_HOST",
  qweatherLocation: "QWEATHER_LOCATION",
  weatherCity: "WEATHER_CITY",
  neteaseAudioLevel: "NETEASE_AUDIO_LEVEL"
};

export function parseEnvFileContent(content = "") {
  const parsed = {};
  const lines = String(content || "").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    parsed[key] = value;
  }
  return parsed;
}

export function loadEnvFile(rootDir, env = process.env) {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return;
  const parsed = parseEnvFileContent(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!env[key]) env[key] = value;
  }
}

export function createConfig({ env = process.env, rootDir }) {
  const dataDir = env.DATA_DIR || path.join(rootDir, "data");
  const openaiBaseUrl = (env.OPENAI_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  return {
    dataDir,
    port: Number(env.PORT || 3088),
    anthropicKey: env.ANTHROPIC_API_KEY || "",
    anthropicModel: env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    fishAudioKey: env.FISH_AUDIO_API_KEY || "",
    fishAudioReferenceId: env.FISH_AUDIO_REFERENCE_ID || "",
    fishAudioModel: env.FISH_AUDIO_MODEL || "s2-pro",
    piperEnabled: (env.PIPER_ENABLED || "true").toLowerCase() !== "false",
    piperCommand: env.PIPER_COMMAND || "piper",
    piperVoice: env.PIPER_VOICE || "models/piper/en_US-lessac-medium.onnx",
    mimoTtsKey: env.MIMO_TTS_API_KEY || "",
    mimoTtsBaseUrl: (env.MIMO_TTS_BASE_URL || "https://api.xiaomimimo.com/v1").replace(/\/$/, ""),
    mimoTtsModel: env.MIMO_TTS_MODEL || "mimo-v2.5-tts",
    mimoVoiceDesignModel: env.MIMO_VOICE_DESIGN_MODEL || "mimo-v2.5-tts-voicedesign",
    mimoTtsVoice: env.MIMO_TTS_VOICE || "冰糖",
    mimoTtsFormat: env.MIMO_TTS_FORMAT || "wav",
    mimoTtsStyle: env.MIMO_TTS_STYLE || "Warm, calm English male private radio DJ voice. Natural, intimate, gently thoughtful, not theatrical. Moderate pace with soft pauses.",
    mimoChatEnabled: (env.MIMO_CHAT_ENABLED || "true").toLowerCase() !== "false",
    mimoChatModel: env.MIMO_CHAT_MODEL || "mimo-v2.5-pro",
    openaiBaseUrl,
    openaiKey: env.OPENAI_API_KEY || "",
    openaiModel: env.OPENAI_MODEL || "gpt-4o-mini",
    openaiChatPath: env.OPENAI_CHAT_PATH || (
      openaiBaseUrl.includes("api.deepseek.com")
        ? "/chat/completions"
        : "/v1/chat/completions"
    ),
    insightPromptVersion: env.INSIGHT_PROMPT_VERSION || "dj-v2",
    qweatherApiKey: env.QWEATHER_API_KEY || env.OPENWEATHER_API_KEY || "",
    qweatherApiHost: (env.QWEATHER_API_HOST || "devapi.qweather.com").replace(/^https?:\/\//, "").replace(/\/$/, ""),
    qweatherLocation: env.QWEATHER_LOCATION || env.WEATHER_CITY || "101020100",
    weatherCity: env.WEATHER_CITY || "上海",
    neteaseCookie: env.NETEASE_COOKIE || "",
    neteaseApiBaseUrl: (env.NETEASE_API_BASE_URL || "http://127.0.0.1:3010").replace(/\/$/, ""),
    neteaseLocalApiEnabled: env.NETEASE_LOCAL_API_ENABLED || "true",
    neteaseLocalApiStartupTimeoutMs: Number(env.NETEASE_LOCAL_API_STARTUP_TIMEOUT_MS || 20000),
    neteaseRealIP: env.NETEASE_REAL_IP || "",
    neteaseApiTimeoutMs: Number(env.NETEASE_API_TIMEOUT_MS || 20000),
    neteaseUrlCacheTtlMinutes: Number(env.NETEASE_URL_CACHE_TTL_MINUTES || 20),
    neteaseAudioLevel: env.NETEASE_AUDIO_LEVEL || "standard",
    remoteCapabilityBaseUrl: (env.REMOTE_CAPABILITY_BASE_URL || "").replace(/\/$/, ""),
    cacheDir: env.CACHE_DIR || path.join(dataDir, "cache"),
    dbPath: env.DB_PATH || path.join(dataDir, "claude-fm.sqlite"),
    insightCacheTtlHours: Number(env.INSIGHT_CACHE_TTL_HOURS || 24 * 14),
    voiceCacheTtlHours: Number(env.VOICE_CACHE_TTL_HOURS || 24 * 30),
    cacheCleanupIntervalHours: Number(env.CACHE_CLEANUP_INTERVAL_HOURS || 6),
    corsOrigins: (env.CORS_ORIGINS || "http://localhost:3088,http://127.0.0.1:3088")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  };
}
