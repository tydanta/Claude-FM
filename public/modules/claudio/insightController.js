import { getInsightCacheClientKey } from "../chat/voiceCacheKeys.js";
import { escapeHtml } from "../ui/formatting.js";

export function createInsightCacheKey(trackId, voiceSettings = {}) {
  // insight 文案会受语言和音色影响；切换音色后必须换 cache key，避免复用旧声音/旧语言的讲解。
  return getInsightCacheClientKey(trackId, voiceSettings);
}

export function buildInsightQuery(trackId, voiceSettings = {}, { force = false, now = Date.now } = {}) {
  const query = new URLSearchParams({
    trackId,
    voiceLanguage: voiceSettings.language || "",
    voicePreset: voiceSettings.preset || "",
    voiceCustom: voiceSettings.customPrompt ? "1" : ""
  });
  if (force) query.set("refresh", String(now()));
  return query;
}

export function createInsightController({
  api,
  chatLog,
  djLine,
  getCurrentTrackId,
  getDjModeEnabled,
  getVoiceSettings,
  getUpcomingTracks,
  getUserStartedPlayback,
  getModelDjLine = () => "",
  renderClaudioNotice,
  clearClaudioNotice,
  getFriendlyModelError,
  renderInsightLoading,
  warmInsightVoice,
  autoSpeakInsight,
  windowRef = window
}) {
  let insightRunId = 0;
  const insightCache = new Map();

  function hasRenderedInsightForTrack(trackId) {
    return Boolean(trackId && chatLog.dataset.insightTrackId === trackId && Number(chatLog.dataset.insightSegmentCount || 0) > 0);
  }

  function renderInsight(insight) {
    chatLog.querySelectorAll(".insight-message").forEach((item) => item.remove());
    const english = insight?.english?.length ? insight.english : (insight?.chinese?.length ? insight.chinese : [getModelDjLine() || "正在准备今天的私人电台。"]);
    const chinese = insight?.chinese?.length ? insight.chinese : [];
    const showTranslation = Boolean(insight?.english?.length && insight?.chinese?.length);
    const insightHtml = english
      .map((paragraph, index) => {
        const translation = showTranslation && chinese[index]
          ? `<span class="chinese">${escapeHtml(chinese[index])}</span>`
          : "";
        return `
        <div class="claudio-message insight-message" style="--message-index: ${index}" data-insight-index="${index}">
          <span class="claudio-avatar tiny" aria-hidden="true"><i></i><b></b><em></em></span>
          <b><span class="english voice-progress-highlight" data-voice-line-index="${index}">${escapeHtml(paragraph)}</span>${translation}</b>
        </div>
      `;
      })
      .join("");
    chatLog.insertAdjacentHTML("afterbegin", insightHtml);

    djLine.textContent = english.join(" ");
    chatLog.dataset.insightTrackId = getCurrentTrackId();
    chatLog.dataset.insightEnglish = JSON.stringify(english);
    chatLog.dataset.insightSegmentCount = String(english.length);
    warmInsightVoice(english);
  }

  async function loadInsightForTrack(trackId, { force = false } = {}) {
    if (!getDjModeEnabled()) return;
    if (!trackId) return;
    const runId = ++insightRunId;
    try {
      const voiceSettings = getVoiceSettings();
      const cacheKey = createInsightCacheKey(trackId, voiceSettings);
      const cached = insightCache.get(cacheKey);
      const query = buildInsightQuery(trackId, voiceSettings, { force });
      const data = !force && cached ? cached : await api(`/api/insight?${query}`);
      if (!force && !cached) insightCache.set(cacheKey, data);
      if (runId !== insightRunId || getCurrentTrackId() !== trackId) return;
      if (data.insight) {
        if (!hasRenderedInsightForTrack(trackId)) {
          renderInsight(data.insight);
        }
        if (data.insightError || data.insight?.error) {
          renderClaudioNotice(getFriendlyModelError(data.insightError || data.insight.error), {
            key: "insight-error",
            actionLabel: "重试",
            action: () => loadInsightForTrack(trackId, { force: true })
          });
        } else {
          clearClaudioNotice("insight-error");
        }
        if (getUserStartedPlayback()) {
          autoSpeakInsight(trackId);
        }
      }
    } catch (error) {
      if (runId !== insightRunId || getCurrentTrackId() !== trackId) return;
      renderClaudioNotice(getFriendlyModelError(error?.message || error), {
        key: "insight-error",
        actionLabel: "重试",
        action: () => loadInsightForTrack(trackId)
      });
    }
  }

  function preloadQueueInsights(queue = []) {
    if (!getDjModeEnabled()) return;
    const voiceSettings = getVoiceSettings();
    const ordered = getUpcomingTracks(queue, 3)
      .filter((track) => track?.id && !insightCache.has(createInsightCacheKey(track.id, voiceSettings)));

    windowRef.setTimeout(async () => {
      for (const track of ordered) {
        const cacheKey = createInsightCacheKey(track.id, voiceSettings);
        if (insightCache.has(cacheKey)) continue;
        try {
          const query = buildInsightQuery(track.id, voiceSettings);
          const data = await api(`/api/insight?${query}`);
          insightCache.set(cacheKey, data);
          if (getCurrentTrackId() === track.id && data.insight) {
            renderInsight(data.insight);
            if (getUserStartedPlayback()) {
              autoSpeakInsight(track.id);
            }
          }
        } catch (error) {
          console.warn("insight preload failed", track.id, error);
          return;
        }
      }
    }, 400);
  }

  function setCachedInsight(trackId, data, voiceSettings = getVoiceSettings()) {
    insightCache.set(createInsightCacheKey(trackId, voiceSettings), data);
  }

  function clearInsightCache() {
    insightCache.clear();
  }

  function invalidateInsightRun() {
    insightRunId += 1;
  }

  return {
    clearInsightCache,
    hasRenderedInsightForTrack,
    invalidateInsightRun,
    insightCache,
    loadInsightForTrack,
    preloadQueueInsights,
    renderInsight,
    setCachedInsight
  };
}
