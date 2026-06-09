import { getSpeechChunks } from "../chat/voiceUtils.js";

export function createMusicDucker({ audio }) {
  let musicVolumeBeforeDucking = null;

  function duckMusicVolume() {
    if (!audio) return;
    if (musicVolumeBeforeDucking === null) {
      musicVolumeBeforeDucking = audio.volume;
    }
    audio.volume = Math.max(0.08, musicVolumeBeforeDucking * 0.35);
  }

  function restoreMusicVolume() {
    if (musicVolumeBeforeDucking === null) return;
    audio.volume = musicVolumeBeforeDucking;
    musicVolumeBeforeDucking = null;
  }

  return {
    duckMusicVolume,
    restoreMusicVolume
  };
}

export function resolveVoiceHighlightOptions(highlightOptions = {}) {
  return highlightOptions.chunkHighlights?.[highlightOptions.currentChunkIndex] || highlightOptions;
}

export function createVoiceController({
  audio,
  voiceAudio,
  speakDjBtn,
  djLine,
  chatLog,
  getVoiceForText,
  getPreparedVoiceFromUrl,
  getVoiceCache,
  appendChatMessage,
  renderClaudioNotice,
  documentRef = document,
  windowRef = window,
  performanceRef = performance
}) {
  const autoDjPlayed = new Set();
  const ducker = createMusicDucker({ audio });
  let highlightTimer = null;
  let activeSpeechKey = null;
  let speechRunId = 0;
  let activeVoiceHighlightOptions = null;
  let activeVoiceRunId = 0;
  let speechPausedByMusic = false;
  let speechPausedByUser = false;
  let voiceWarmupId = 0;

  function clearWordHighlight() {
    if (highlightTimer) {
      windowRef.clearInterval(highlightTimer);
      highlightTimer = null;
    }
    documentRef.querySelectorAll(".voice-progress-highlight").forEach((item) => {
      item.classList.remove("is-speaking");
      item.style?.removeProperty?.("--voice-progress");
    });
  }

  function stopSpeech() {
    speechRunId += 1;
    activeSpeechKey = null;
    activeVoiceHighlightOptions = null;
    activeVoiceRunId = 0;
    speechPausedByMusic = false;
    speechPausedByUser = false;
    voiceAudio.pause();
    voiceAudio.removeAttribute("src");
    voiceAudio.onloadedmetadata = null;
    voiceAudio.onended = null;
    voiceAudio.onerror = null;
    windowRef.speechSynthesis?.cancel();
    clearWordHighlight();
    if (speakDjBtn) {
      speakDjBtn.disabled = false;
      speakDjBtn.removeAttribute("aria-busy");
    }
    ducker.restoreMusicVolume();
  }

  function startWordHighlight(durationMs, options = {}) {
    clearWordHighlight();
    const lines = [...documentRef.querySelectorAll(".voice-progress-highlight")];
    if (!lines.length) return;
    const rawSegmentIndex = Number(options.segmentIndex ?? options.segmentStartIndex ?? options.startLineIndex ?? 0);
    const segmentIndex = Number.isFinite(rawSegmentIndex)
      ? Math.max(0, Math.min(lines.length - 1, rawSegmentIndex))
      : 0;
    const line = lines[segmentIndex];
    if (!line) return;
    const hasReliableDuration = Number.isFinite(Number(durationMs)) && Number(durationMs) > 0;
    const safeDuration = hasReliableDuration
      ? Math.max(Number(durationMs), 400)
      : 1600;
    const offsetMs = Math.max(0, Math.min(Number(options.offsetMs || 0), safeDuration));
    const audioEl = options.audioEl || null;
    const startedAt = performanceRef.now() - offsetMs;

    highlightTimer = windowRef.setInterval(() => {
      const elapsedMs = audioEl && Number.isFinite(audioEl.currentTime)
        ? audioEl.currentTime * 1000
        : performanceRef.now() - startedAt;
      const progress = Math.min(elapsedMs / safeDuration, 1);
      lines.forEach((item) => {
        const active = item === line;
        item.classList.toggle("is-speaking", active);
        if (!active) item.style?.removeProperty?.("--voice-progress");
      });
      line.style?.setProperty?.("--voice-progress", `${Math.round(progress * 100)}%`);
      if (!audioEl && progress >= 1) {
        clearWordHighlight();
      }
    }, 90);
  }

  function pauseVoiceForMusic() {
    if (!activeSpeechKey || voiceAudio.paused) return;
    // 音乐暂停/切歌时只临时暂停 DJ 语音，不恢复为用户暂停；音乐继续后可自动接上当前讲解。
    speechPausedByMusic = true;
    voiceAudio.pause();
    if (highlightTimer) {
      windowRef.clearInterval(highlightTimer);
      highlightTimer = null;
    }
  }

  function pauseVoiceForUser() {
    if (!activeSpeechKey || voiceAudio.paused) return;
    // 用户手动打断语音时立即恢复音乐音量，并阻止音乐事件自动恢复这段 DJ 语音。
    speechPausedByUser = true;
    speechPausedByMusic = false;
    voiceAudio.pause();
    if (highlightTimer) {
      windowRef.clearInterval(highlightTimer);
      highlightTimer = null;
    }
    ducker.restoreMusicVolume();
  }

  function resumeActiveVoice() {
    if (!activeSpeechKey || !voiceAudio.src) return;
    if (activeVoiceHighlightOptions?.autoSpeech && audio.paused) return;
    speechPausedByMusic = false;
    speechPausedByUser = false;
    if (activeVoiceHighlightOptions?.duckMusic !== false) {
      ducker.duckMusicVolume();
    }
    voiceAudio.play().then(() => {
      startActiveVoiceHighlight();
    }).catch(() => {});
  }

  function resumeVoiceForMusic() {
    if (!speechPausedByMusic || speechPausedByUser) return;
    resumeActiveVoice();
  }

  function startActiveVoiceHighlight() {
    if (
      !activeVoiceHighlightOptions ||
      activeVoiceRunId !== speechRunId ||
      activeVoiceHighlightOptions.enabled === false ||
      (activeVoiceHighlightOptions.autoSpeech && audio.paused)
    ) {
      return;
    }
    const chunkHighlight = resolveVoiceHighlightOptions(activeVoiceHighlightOptions);
    startWordHighlight((voiceAudio.duration || 0) * 1000, {
      ...chunkHighlight,
      offsetMs: voiceAudio.currentTime * 1000,
      audioEl: voiceAudio
    });
  }

  function speakWithBrowser(text, runId = speechRunId) {
    if (!("speechSynthesis" in windowRef)) {
      appendChatMessage("assistant", "当前浏览器暂时不能播放语音。");
      return;
    }
    windowRef.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => startWordHighlight(text.split(/\s+/).length * 420);
    utterance.onend = () => {
      if (runId === speechRunId) {
        activeSpeechKey = null;
        clearWordHighlight();
      }
    };
    utterance.onerror = () => {
      if (runId === speechRunId) {
        activeSpeechKey = null;
        clearWordHighlight();
      }
    };
    windowRef.speechSynthesis.speak(utterance);
  }

  async function warmVoiceChunks(chunks, warmupId) {
    for (const chunk of chunks) {
      if (warmupId !== voiceWarmupId) return;
      try {
        await getVoiceForText(chunk);
      } catch (error) {
        console.warn("voice warmup failed", error);
        return;
      }
    }
  }

  function warmInsightVoice(english) {
    voiceWarmupId += 1;
    const warmupId = voiceWarmupId;
    const chunks = getSpeechChunks("", english);
    windowRef.setTimeout(() => warmVoiceChunks(chunks, warmupId), 300);
  }

  function speakInsightFrom(start = 0, { auto = false, currentTrackId = "" } = {}) {
    const english = JSON.parse(chatLog.dataset.insightEnglish || "[]");
    if (!english.length) return;
    speakDjLine(english.slice(start).join(" "), {
      key: `insight:${currentTrackId}:${start}`,
      autoSpeech: auto,
      chunks: english.slice(start),
      chunkHighlights: english.slice(start).map((_, offset) => ({
        segmentIndex: start + offset
      })),
      segmentIndex: start,
      duckMusic: true
    });
  }

  function autoSpeakInsight(trackId, getCurrentTrackId) {
    if (!trackId || autoDjPlayed.has(trackId) || getCurrentTrackId() !== trackId) return;
    autoDjPlayed.add(trackId);
    windowRef.setTimeout(() => {
      if (getCurrentTrackId() === trackId) {
        speakInsightFrom(0, { auto: true, currentTrackId: trackId });
      }
    }, 150);
  }

  function playVoiceUrl(audioUrl, highlightOptions, runId, isLastChunk) {
    return new Promise((resolve, reject) => {
      activeVoiceHighlightOptions = highlightOptions;
      activeVoiceRunId = runId;
      voiceAudio.onloadedmetadata = () => {
        if (runId !== speechRunId) return;
        if (!voiceAudio.paused) startActiveVoiceHighlight();
      };
      voiceAudio.onended = () => {
        if (runId === speechRunId && isLastChunk) {
          activeSpeechKey = null;
          activeVoiceHighlightOptions = null;
          activeVoiceRunId = 0;
          speechPausedByMusic = false;
          speechPausedByUser = false;
          clearWordHighlight();
          ducker.restoreMusicVolume();
        }
        resolve();
      };
      voiceAudio.onerror = () => {
        if (runId === speechRunId && isLastChunk) {
          activeSpeechKey = null;
          activeVoiceHighlightOptions = null;
          activeVoiceRunId = 0;
          speechPausedByMusic = false;
          speechPausedByUser = false;
          clearWordHighlight();
          ducker.restoreMusicVolume();
        }
        reject(new Error("Voice playback failed."));
      };
      voiceAudio.src = audioUrl;
      if (audio.paused && highlightOptions.autoSpeech) {
        speechPausedByMusic = true;
        speechPausedByUser = false;
        return;
      }
      // 播放 DJ 语音前先降低音乐音量，语音结束/失败/用户暂停后再恢复，避免两路声音互相盖住。
      voiceAudio.play().then(startActiveVoiceHighlight).catch(reject);
    });
  }

  async function speakDjLine(textOverride, highlightOptions = {}) {
    const text = String(textOverride || djLine.textContent).trim();
    if (!text) return;
    const speechKey = highlightOptions.key || text;
    if (activeSpeechKey === speechKey) {
      if (speechPausedByUser) {
        resumeActiveVoice();
      } else {
        pauseVoiceForUser();
      }
      return;
    }
    stopSpeech();
    const runId = speechRunId;
    activeSpeechKey = speechKey;
    if (highlightOptions.duckMusic !== false) {
      ducker.duckMusicVolume();
    }
    if (speakDjBtn) {
      speakDjBtn.disabled = true;
      speakDjBtn.setAttribute("aria-busy", "true");
    }
    try {
      if (highlightOptions.audioUrl) {
        const result = await getPreparedVoiceFromUrl(highlightOptions.audioUrl, highlightOptions.mimeType, speechKey);
        if (runId !== speechRunId) return;
        windowRef.speechSynthesis?.cancel();
        await playVoiceUrl(result.audioUrl, { ...highlightOptions, enabled: false }, runId, true);
        return;
      }
      const chunks = getSpeechChunks(text, highlightOptions.chunks);
      for (let index = 0; index < chunks.length; index += 1) {
        if (runId !== speechRunId) return;
        const chunk = chunks[index];
        const result = await getVoiceForText(chunk);
        if (runId !== speechRunId) return;
        windowRef.speechSynthesis?.cancel();
        highlightOptions.currentChunkIndex = index;
        await playVoiceUrl(result.audioUrl, highlightOptions, runId, index === chunks.length - 1);
      }
    } catch (error) {
      if (runId === speechRunId) {
        activeSpeechKey = null;
        renderClaudioNotice("Claudio 的语音暂时不可用，但文字内容仍然可以阅读。", {
          key: "voice-error",
          actionLabel: "重试语音",
          action: () => speakDjLine(textOverride, highlightOptions)
        });
      }
    } finally {
      if (runId === speechRunId && speakDjBtn) {
        speakDjBtn.disabled = false;
        speakDjBtn.removeAttribute("aria-busy");
      }
      if (runId === speechRunId && !activeSpeechKey) {
        ducker.restoreMusicVolume();
      }
    }
  }

  function refreshVoiceRuntime() {
    stopSpeech();
    getVoiceCache()?.clear();
    voiceWarmupId += 1;
  }

  function invalidateVoiceWarmup() {
    voiceWarmupId += 1;
  }

  return {
    autoDjPlayed,
    autoSpeakInsight,
    clearWordHighlight,
    pauseVoiceForMusic,
    pauseVoiceForUser,
    invalidateVoiceWarmup,
    refreshVoiceRuntime,
    resumeVoiceForMusic,
    speakDjLine,
    speakInsightFrom,
    speakWithBrowser,
    startWordHighlight,
    stopSpeech,
    warmInsightVoice
  };
}
