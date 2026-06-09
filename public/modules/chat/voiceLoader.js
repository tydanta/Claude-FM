import { getVoiceClientCacheKey } from "./voiceCacheKeys.js";
import { sanitizeVoiceText } from "./voiceUtils.js";

export function createVoiceLoader({
  api,
  fetchImpl = fetch,
  resolveApiAssetUrl = (url) => url,
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  AudioCtor = Audio,
  getVoiceSettings = () => ({})
}) {
  const voiceCache = new Map();

  async function prepareVoiceResult(result) {
    const response = await fetchImpl(resolveApiAssetUrl(result.audioUrl));
    const blob = await response.blob();
    const objectUrl = createObjectUrl(blob);
    const preloadAudio = new AudioCtor();
    preloadAudio.preload = "auto";
    preloadAudio.src = objectUrl;
    await new Promise((resolve) => {
      const done = () => {
        preloadAudio.oncanplaythrough = null;
        preloadAudio.onloadedmetadata = null;
        preloadAudio.onerror = null;
        resolve();
      };
      preloadAudio.oncanplaythrough = done;
      preloadAudio.onloadedmetadata = done;
      preloadAudio.onerror = done;
      preloadAudio.load();
    });
    return {
      ...result,
      audioUrl: objectUrl,
      originalAudioUrl: result.audioUrl
    };
  }

  async function getVoiceForText(text) {
    const cleanText = sanitizeVoiceText(text);
    if (!cleanText) throw new Error("Empty voice text.");
    const voiceSettings = getVoiceSettings();
    const cacheKey = getVoiceClientCacheKey(cleanText, voiceSettings);
    if (voiceCache.has(cacheKey)) {
      return voiceCache.get(cacheKey);
    }
    // 缓存进行中的 Promise，连续点击朗读时复用同一次后端语音生成。
    const pending = api("/api/voice", {
      method: "POST",
      body: JSON.stringify({ text: cleanText, voiceSettings })
    }).then((result) => {
      if (!result.audioUrl) {
        throw new Error(result.reason || `Voice provider fallback: ${result.provider || "browser"}`);
      }
      return prepareVoiceResult(result);
    }).catch((error) => {
      voiceCache.delete(cacheKey);
      throw error;
    });
    voiceCache.set(cacheKey, pending);
    return pending;
  }

  async function getPreparedVoiceFromUrl(audioUrl, mimeType = "audio/wav", cacheKey = audioUrl) {
    const key = `direct:${cacheKey}`;
    if (voiceCache.has(key)) return voiceCache.get(key);
    const pending = prepareVoiceResult({
      provider: "mimo",
      audioUrl,
      mimeType,
      cached: true
    }).catch((error) => {
      voiceCache.delete(key);
      throw error;
    });
    voiceCache.set(key, pending);
    return pending;
  }

  return {
    voiceCache,
    prepareVoiceResult,
    getVoiceForText,
    getPreparedVoiceFromUrl
  };
}
