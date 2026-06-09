import { sanitizeVoiceText } from "./voiceUtils.js";

export function getVoiceClientCacheKey(text, settings = {}) {
  // 缓存 key 必须包含音色配置，避免切换预置/自定义音色后复用旧音频。
  return [
    sanitizeVoiceText(text),
    settings.preset || "",
    settings.customPrompt ? `custom:${settings.customPrompt}` : "preset"
  ].join("|");
}

export function getInsightCacheClientKey(trackId, settings = {}) {
  return [
    trackId,
    settings.language || "",
    settings.preset || "",
    settings.customPrompt ? "custom" : "preset"
  ].join(":");
}
