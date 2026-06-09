export function createInsightRuntimeService({
  config,
  state,
  tracks,
  insightCache = new Map(),
  secretFingerprint,
  getInsightCacheKey,
  readCachedInsight,
  writeCachedInsight,
  askOpenAIForInsight,
  mockInsight,
  mockChineseInsight,
  sanitizeVoiceText,
  synthesizeVoice,
  getWeather,
  getSchedule,
  getTimeBlock,
  warmTrackAssets: warmTrackAssetsOverride = null
}) {
  async function getInsightForTrack(track, weather, schedule, timeBlock, { voiceLanguage = "" } = {}) {
    const keyFingerprint = secretFingerprint(config.openaiKey);
    const diskCacheKey = getInsightCacheKey({
      track,
      weather,
      timeBlock,
      voiceLanguage,
      keyFingerprint
    });
    const cacheKey = [
      track.id,
      weather.summary,
      weather.tempC,
      timeBlock,
      voiceLanguage,
      config.openaiBaseUrl,
      config.openaiModel,
      keyFingerprint,
      Boolean(config.openaiKey && config.openaiKey !== config.openaiBaseUrl)
    ].join(":");
    if (insightCache.has(cacheKey)) {
      return insightCache.get(cacheKey);
    }
    const pending = (async () => {
      const cachedPayload = await readCachedInsight(diskCacheKey);
      if (cachedPayload) {
        return {
          ...cachedPayload,
          insight: {
            ...cachedPayload.insight,
            cached: true
          }
        };
      }

      let insightError = null;
      let insight;
      try {
        insight = await askOpenAIForInsight({
          weather,
          schedule,
          track,
          timeBlock,
          preferences: state.preferences,
          voiceLanguage
        });
      } catch (error) {
        insightError = error instanceof Error ? error.message : String(error);
        const fallbackInsight = voiceLanguage === "en"
          ? mockInsight(track, weather, timeBlock)
          : mockChineseInsight(track, weather, timeBlock);
        insight = {
          ...fallbackInsight,
          provider: "mock-fallback",
          error: insightError
        };
      }
      const payload = { insight, insightError };
      if (insight?.provider && !String(insight.provider).startsWith("mock")) {
        await writeCachedInsight(diskCacheKey, payload);
      }
      return payload;
    })();
    insightCache.set(cacheKey, pending);
    return pending;
  }

  async function warmTrackAssets(track, weather, schedule, timeBlock) {
    const { insight } = await getInsightForTrack(track, weather, schedule, timeBlock);
    const voiceParagraphs = Array.isArray(insight?.english) && insight.english.length
      ? insight.english
      : (insight?.chinese || []);
    const voice = [];
    for (const paragraph of voiceParagraphs) {
      const text = sanitizeVoiceText(paragraph).slice(0, 900);
      if (!text) continue;
      try {
        const result = await synthesizeVoice(text);
        voice.push({
          text,
          provider: result.provider,
          cached: Boolean(result.cached),
          ready: Boolean(result.audioUrl)
        });
      } catch (error) {
        voice.push({
          text,
          provider: "none",
          ready: false,
          reason: error instanceof Error ? error.message : String(error)
        });
        break;
      }
    }
    return {
      trackId: track.id,
      insightReady: Boolean(insight),
      insightProvider: insight?.provider || "unknown",
      voice
    };
  }

  async function prewarmQueue({ startIndex = state.currentIndex, limit = 3, location = null } = {}) {
    const [weather, schedule] = await Promise.all([getWeather(location), getSchedule()]);
    const timeBlock = getTimeBlock();
    const results = [];
    const safeLimit = Math.max(0, Math.min(tracks.length, Number(limit) || 0));
    const warm = warmTrackAssetsOverride || warmTrackAssets;
    for (let offset = 1; offset <= safeLimit; offset += 1) {
      const index = (startIndex + offset) % tracks.length;
      const track = tracks[index];
      try {
        results.push(await warm(track, weather, schedule, timeBlock));
      } catch (error) {
        results.push({
          trackId: track.id,
          insightReady: false,
          voice: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    return results;
  }

  return {
    getInsightForTrack,
    warmTrackAssets,
    prewarmQueue
  };
}
