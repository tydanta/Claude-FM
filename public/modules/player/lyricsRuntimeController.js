function normalizeLyricsElements(elements = {}) {
  return {
    lyricLine: elements.lyricLine,
    playerLyrics: elements.playerLyrics
  };
}

const PLAYER_LYRIC_USER_IDLE_MS = 2000;
const PLAYER_LYRIC_MANUAL_SCROLL_GRACE_MS = 900;
const PLAYER_LYRIC_LATE_START_REFRESH_SECONDS = 45;

export function createLyricsRuntimeController({
  elements = {},
  audio = { currentTime: 0 },
  api = async () => ({}),
  neteaseApi = null,
  lyricMocks = {},
  buildMockLyrics = () => [],
  parseLyricText = () => [],
  mergeTranslatedLyrics = (lines) => lines,
  getLyricIndexAt = () => -1,
  escapeHtml = (value) => String(value ?? ""),
  formatTime = () => "0:00",
  documentRef = document,
  nowFn = () => Date.now(),
  performanceRef = performance,
  requestAnimationFrameFn = requestAnimationFrame,
  cancelAnimationFrameFn = cancelAnimationFrame,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
} = {}) {
  const {
    lyricLine,
    playerLyrics
  } = normalizeLyricsElements(elements);

  const lyricsCache = new Map();
  let activeLyrics = [];
  let activeLyricTrackId = "";
  let activeLyricIndex = -1;
  let lyricRunId = 0;
  let playerLyricUserScrollUntil = 0;
  let playerLyricAutoScrollFrame = 0;
  let playerLyricAutoScrolling = false;
  let playerLyricIgnoreScrollUntil = 0;
  let playerLyricAutoResumeTimer = 0;
  let playerLyricManualGestureUntil = 0;
  let manualPreviewLyricIndex = null;
  let playerLyricListJustRendered = false;
  let lyricClockOverride = null;

  function getRuntimeLyricIndexAt(seconds = 0) {
    return getLyricIndexAt(seconds, activeLyrics);
  }

  function getLyricClockTime() {
    return Number.isFinite(lyricClockOverride)
      ? lyricClockOverride
      : Number(audio.currentTime || 0);
  }

  function renderPlayerLyricsEmpty(message = "歌词加载中...") {
    if (!playerLyrics) return;
    clearTimeoutFn(playerLyricAutoResumeTimer);
    playerLyrics.dataset.lyricTrackId = "";
    playerLyrics.dataset.lyricCount = "0";
    delete playerLyrics.dataset.previewLyricIndex;
    playerLyrics.classList?.remove("is-manual-preview");
    playerLyrics.style?.removeProperty?.("--player-lyric-offset");
    playerLyrics.scrollTop = 0;
    playerLyrics.innerHTML = `<div class="player-lyric-item player-lyric-empty is-current"><div class="player-lyric-copy"><span class="player-lyric-main">${escapeHtml(message)}</span></div></div>`;
  }

  function renderPlayerLyricsList() {
    if (!playerLyrics) return;
    if (!activeLyrics.length) {
      renderPlayerLyricsEmpty();
      return;
    }
    playerLyrics.scrollTop = 0;
    playerLyrics.classList?.remove("is-manual-preview");
    playerLyrics.style?.setProperty?.("--player-lyric-offset", "0px");
    playerLyrics.dataset.lyricTrackId = activeLyricTrackId;
    playerLyrics.dataset.lyricCount = String(activeLyrics.length);
    playerLyrics.innerHTML = `<div class="player-lyric-track">${activeLyrics
      .map((line, index) => {
        const time = formatTime(line.time || 0);
        return `
        <div class="player-lyric-item" data-player-lyric-index="${index}" title="${time}">
          <span class="player-lyric-time">${time}</span>
          <span class="player-lyric-rule" aria-hidden="true"></span>
          <div class="player-lyric-copy">
            <span class="player-lyric-main">${escapeHtml(line.text || "...")}</span>
            ${line.translation ? `<small class="player-lyric-translation">${escapeHtml(line.translation)}</small>` : ""}
          </div>
          <button class="player-lyric-seek-btn" type="button" data-player-lyric-seek-index="${index}" aria-label="Seek lyric at ${time}" title="${time}">
            <span aria-hidden="true"></span>
          </button>
        </div>
      `;
      })
      .join("")}</div>`;
    playerLyrics.scrollTop = 0;
    playerLyricListJustRendered = true;
  }

  function clearPlayerLyricPreview() {
    if (!playerLyrics) return;
    playerLyrics.querySelectorAll(".player-lyric-item.is-preview").forEach((item) => {
      item.classList.remove("is-preview");
    });
    delete playerLyrics.dataset.previewLyricIndex;
    manualPreviewLyricIndex = null;
  }

  function applyPlayerLyricClasses(index) {
    if (!playerLyrics) return;
    playerLyrics.querySelectorAll(".player-lyric-item").forEach((item) => {
      const itemIndex = Number(item.dataset.playerLyricIndex);
      item.classList.toggle("is-current", itemIndex === index);
      item.classList.toggle("is-near", Math.abs(itemIndex - index) === 1);
    });
  }

  function getCurrentPlayerLyricIndex() {
    const currentIndex = activeLyricIndex >= 0
      ? activeLyricIndex
      : getRuntimeLyricIndexAt(getLyricClockTime());
    return Number.isFinite(currentIndex) ? currentIndex : -1;
  }

  function getPlayerLyricCenteredTop(item) {
    if (!playerLyrics || !item) return 0;
    const track = playerLyrics.querySelector?.(".player-lyric-track");
    const contentHeight = Math.max(playerLyrics.scrollHeight || 0, track?.scrollHeight || 0);
    const maxScrollTop = Math.max(0, contentHeight - playerLyrics.clientHeight);
    let targetTop = item.offsetTop + (item.offsetHeight / 2) - (playerLyrics.clientHeight / 2);
    if (typeof item.getBoundingClientRect === "function" && typeof playerLyrics.getBoundingClientRect === "function") {
      const itemRect = item.getBoundingClientRect();
      const containerRect = playerLyrics.getBoundingClientRect();
      const itemCenter = itemRect.top + itemRect.height / 2;
      const containerCenter = containerRect.top + containerRect.height / 2;
      targetTop = (playerLyrics.scrollTop || 0) + getPlayerLyricTrackOffset() + itemCenter - containerCenter;
    }
    return Math.max(0, Math.min(targetTop, maxScrollTop));
  }

  function getPlayerLyricTrackOffset() {
    const rawOffset = playerLyrics?.style?.getPropertyValue?.("--player-lyric-offset");
    const parsedOffset = Number.parseFloat(String(rawOffset || "0"));
    return Number.isFinite(parsedOffset) ? parsedOffset : 0;
  }

  function setPlayerLyricTrackOffset(offset) {
    if (!playerLyrics) return;
    playerLyrics.style?.setProperty?.("--player-lyric-offset", `${Math.max(0, Math.round(offset))}px`);
  }

  function centerActivePlayerLyric({ animated = false } = {}) {
    if (!playerLyrics || !activeLyrics.length) return false;
    const currentIndex = getCurrentPlayerLyricIndex();
    if (currentIndex < 0) return false;
    const activeItem = playerLyrics.querySelector(`[data-player-lyric-index="${currentIndex}"]`);
    if (!activeItem) return false;
    const targetTop = getPlayerLyricCenteredTop(activeItem);
    playerLyrics.classList?.toggle("is-lyric-jump", !animated);
    playerLyrics.classList?.remove("is-manual-preview");
    playerLyrics.scrollTop = 0;
    setPlayerLyricTrackOffset(targetTop);
    if (!animated) {
      requestAnimationFrameFn(() => playerLyrics.classList?.remove("is-lyric-jump"));
    }
    return true;
  }

  function schedulePlayerLyricAutoResume() {
    clearTimeoutFn(playerLyricAutoResumeTimer);
    playerLyricAutoResumeTimer = setTimeoutFn(() => {
      if (documentRef.body.dataset.page !== "player") return;
      if (nowFn() < playerLyricUserScrollUntil) {
        schedulePlayerLyricAutoResume();
        return;
      }
      clearPlayerLyricPreview();
      centerActivePlayerLyric({ animated: true });
    }, PLAYER_LYRIC_USER_IDLE_MS);
  }

  function markPlayerLyricPreview(index) {
    if (!playerLyrics || !activeLyrics.length || !Number.isFinite(index)) return false;
    const previewItem = playerLyrics.querySelector(`[data-player-lyric-index="${index}"]`);
    if (!previewItem) return false;
    playerLyrics.dataset.previewLyricIndex = String(index);
    playerLyrics.querySelectorAll(".player-lyric-item").forEach((item) => {
      item.classList.toggle("is-preview", item === previewItem);
    });
    return true;
  }

  function previewPlayerLyricIndex(index) {
    const normalizedIndex = Number(index);
    if (!markPlayerLyricPreview(normalizedIndex)) return false;
    manualPreviewLyricIndex = normalizedIndex;
    playerLyricUserScrollUntil = nowFn() + PLAYER_LYRIC_USER_IDLE_MS;
    schedulePlayerLyricAutoResume();
    return true;
  }

  function updatePlayerLyricPreviewFromScroll() {
    if (!playerLyrics || !activeLyrics.length) return;
    manualPreviewLyricIndex = null;
    const hasRectMetrics = typeof playerLyrics.getBoundingClientRect === "function";
    const viewportCenter = hasRectMetrics
      ? playerLyrics.getBoundingClientRect().top + playerLyrics.getBoundingClientRect().height / 2
      : playerLyrics.scrollTop + playerLyrics.clientHeight / 2;
    let previewItem = null;
    let previewDistance = Number.POSITIVE_INFINITY;
    playerLyrics.querySelectorAll(".player-lyric-item[data-player-lyric-index]").forEach((item) => {
      const itemCenter = hasRectMetrics && typeof item.getBoundingClientRect === "function"
        ? item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2
        : item.offsetTop + item.offsetHeight / 2;
      const distance = Math.abs(itemCenter - viewportCenter);
      if (distance < previewDistance) {
        previewDistance = distance;
        previewItem = item;
      }
    });
    if (!previewItem) return;
    markPlayerLyricPreview(Number(previewItem.dataset.playerLyricIndex));
  }


  function updatePlayerLyricPosition(index) {
    if (!playerLyrics) return;
    if (
      playerLyrics.dataset.lyricTrackId !== activeLyricTrackId
      || Number(playerLyrics.dataset.lyricCount || 0) !== activeLyrics.length
    ) {
      renderPlayerLyricsList();
    }
    applyPlayerLyricClasses(index);
    if (documentRef.body.dataset.page === "player") {
      if (nowFn() < playerLyricUserScrollUntil) {
        if (manualPreviewLyricIndex === null) {
          updatePlayerLyricPreviewFromScroll();
        } else {
          markPlayerLyricPreview(manualPreviewLyricIndex);
        }
        return;
      }
      clearPlayerLyricPreview();
      centerActivePlayerLyric({ animated: !playerLyricListJustRendered });
      playerLyricListJustRendered = false;
    }
  }

  function renderLyricList() {
    if (!lyricLine) return;
    lyricLine.dataset.lyricTrackId = activeLyricTrackId;
    lyricLine.dataset.lyricCount = String(activeLyrics.length);
    lyricLine.innerHTML = `
      <div class="lyric-viewport">
        <div class="lyric-scroll">
          ${activeLyrics.map((line, index) => `
            <div class="lyric-item" data-lyric-index="${index}">
              <span class="lyric-main">${escapeHtml(line.text || "...")}</span>
              ${line.translation ? `<span class="lyric-translation">${escapeHtml(line.translation)}</span>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
    renderPlayerLyricsList();
  }

  function updateLyricPosition(index) {
    if (!lyricLine) return;
    const scroll = lyricLine.querySelector(".lyric-scroll");
    if (!scroll) {
      renderLyricList();
      return;
    }
    scroll.style.setProperty("--lyric-index", String(Math.max(0, index)));
    lyricLine.querySelectorAll(".lyric-item").forEach((item) => {
      const itemIndex = Number(item.dataset.lyricIndex);
      item.classList.toggle("is-current", itemIndex === index);
      item.classList.toggle("is-near", Math.abs(itemIndex - index) === 1);
    });
    updatePlayerLyricPosition(index);
  }

  function renderLoading(message = "歌词加载中...") {
    if (!lyricLine) return;
    lyricLine.dataset.lyricTrackId = "";
    lyricLine.dataset.lyricCount = "0";
    lyricLine.innerHTML = `<div class="lyric-viewport"><div class="lyric-scroll"><div class="lyric-item is-current"><span class="lyric-main">${escapeHtml(message)}</span></div></div></div>`;
    renderPlayerLyricsEmpty(message);
  }

  function renderLyric(trackId) {
    if (!lyricLine) return;
    if (activeLyricTrackId !== trackId || !activeLyrics.length) {
      renderLoading("歌词加载中...");
      return;
    }
    if (
      !lyricLine.querySelector(".lyric-scroll")
      || lyricLine.dataset.lyricTrackId !== activeLyricTrackId
      || Number(lyricLine.dataset.lyricCount || 0) !== activeLyrics.length
    ) {
      renderLyricList();
    }
    const index = getRuntimeLyricIndexAt(getLyricClockTime());
    if (index === activeLyricIndex) return;
    activeLyricIndex = index;
    updateLyricPosition(index);
  }

  function setLyricClockOverride(seconds) {
    const nextTime = Math.max(0, Number(seconds || 0));
    lyricClockOverride = Number.isFinite(nextTime) ? nextTime : null;
  }

  function clearLyricClockOverride() {
    lyricClockOverride = null;
  }

  function getCacheKey(track) {
    return track?.source === "netease" && track.sourceId
      ? `netease:${track.sourceId}`
      : `local:${track?.id || ""}`;
  }

  function getFirstPlayableLyricTime(lines = []) {
    const playableLine = lines.find((line) => !line.isCredit);
    return Number(playableLine?.time ?? lines[0]?.time ?? Number.POSITIVE_INFINITY);
  }

  function getPlayableLyricCount(lines = []) {
    return lines.filter((line) => !line.isCredit).length;
  }

  function chooseParsedLyrics(primaryLines = [], yrcLines = []) {
    if (!yrcLines.length) return primaryLines;
    if (!primaryLines.length) return yrcLines;

    const primaryFirstTime = getFirstPlayableLyricTime(primaryLines);
    const yrcFirstTime = getFirstPlayableLyricTime(yrcLines);
    const primaryPlayableCount = getPlayableLyricCount(primaryLines);
    const yrcPlayableCount = getPlayableLyricCount(yrcLines);

    if (yrcFirstTime + 1 < primaryFirstTime) return yrcLines;
    if (yrcPlayableCount > primaryPlayableCount * 1.25 && yrcFirstTime <= primaryFirstTime + 1) {
      return yrcLines;
    }
    return primaryLines;
  }

  function shouldRefreshLateStartingLyrics(lines = []) {
    return getFirstPlayableLyricTime(lines) > PLAYER_LYRIC_LATE_START_REFRESH_SECONDS;
  }

  async function loadLyricsForTrack(track, { refresh = false } = {}) {
    if (!track?.id) return;
    const runId = ++lyricRunId;
    activeLyricTrackId = track.id;
    activeLyricIndex = -1;
    manualPreviewLyricIndex = null;
    clearTimeoutFn(playerLyricAutoResumeTimer);
    playerLyricManualGestureUntil = 0;
    clearPlayerLyricPreview();
    cancelAnimationFrameFn(playerLyricAutoScrollFrame);

    const cacheKey = getCacheKey(track);
    if (!refresh && lyricsCache.has(cacheKey)) {
      activeLyrics = lyricsCache.get(cacheKey);
      renderLyric(track.id);
      if (track.source === "netease" && shouldRefreshLateStartingLyrics(activeLyrics)) {
        loadLyricsForTrack(track, { refresh: true }).catch(() => {});
      }
      return;
    }

    if (!refresh) {
      activeLyrics = [];
      renderLoading("歌词加载中...");
    }

    if (track.source !== "netease" || !track.sourceId) {
      activeLyrics = buildMockLyrics(track.id, lyricMocks);
      lyricsCache.set(cacheKey, activeLyrics);
      renderLyric(track.id);
      return;
    }

    renderLoading("歌词加载中...");
    try {
      const data = neteaseApi?.getLyrics
        ? await neteaseApi.getLyrics({ songId: track.sourceId, refresh })
        : await api(`/api/lyrics?source=netease&id=${encodeURIComponent(track.sourceId)}${refresh ? "&refresh=1" : ""}`, {
            weatherLocationQuery: false
          });
      if (runId !== lyricRunId || activeLyricTrackId !== track.id) return;
      const parsed = parseLyricText(data.lyric || "");
      const parsedYrc = parseLyricText(data.yrcLyric || "");
      const translated = parseLyricText(data.translatedLyric || "");
      const selectedLyrics = chooseParsedLyrics(parsed, parsedYrc);
      if (!refresh && shouldRefreshLateStartingLyrics(selectedLyrics)) {
        await loadLyricsForTrack(track, { refresh: true });
        return;
      }
      activeLyrics = selectedLyrics.length
        ? mergeTranslatedLyrics(selectedLyrics, translated)
        : [{ time: 0, text: "暂无歌词", translation: "" }];
      lyricsCache.set(cacheKey, activeLyrics);
      renderLyric(track.id);
    } catch {
      if (runId !== lyricRunId || activeLyricTrackId !== track.id) return;
      activeLyrics = [{ time: 0, text: "歌词暂时加载失败", translation: "" }];
      renderLyric(track.id);
    }
  }

  function syncPlayerLyrics({ anchor = "current" } = {}) {
    if (activeLyrics.length) {
      renderPlayerLyricsList();
      updatePlayerLyricPosition(getCurrentPlayerLyricIndex());
    } else if (playerLyrics) {
      renderPlayerLyricsEmpty();
    }
  }

  function resetPlayerLyricUserScroll() {
    playerLyricUserScrollUntil = 0;
    playerLyricManualGestureUntil = 0;
    clearTimeoutFn(playerLyricAutoResumeTimer);
    playerLyrics?.classList?.remove("is-manual-preview");
    clearPlayerLyricPreview();
  }

  function handlePlayerLyricsScroll() {
    if (documentRef.body.dataset.page !== "player") return;
    if (playerLyricAutoScrolling || nowFn() < playerLyricIgnoreScrollUntil) return;
    if (nowFn() > playerLyricManualGestureUntil) return;
    playerLyricUserScrollUntil = nowFn() + PLAYER_LYRIC_USER_IDLE_MS;
    updatePlayerLyricPreviewFromScroll();
    schedulePlayerLyricAutoResume();
  }

  function handlePlayerLyricsPointerInteraction() {
    if (documentRef.body.dataset.page !== "player") return;
    playerLyricManualGestureUntil = nowFn() + PLAYER_LYRIC_MANUAL_SCROLL_GRACE_MS;
    playerLyricAutoScrolling = false;
    playerLyricIgnoreScrollUntil = 0;
    manualPreviewLyricIndex = null;
    cancelAnimationFrameFn(playerLyricAutoScrollFrame);
    playerLyricUserScrollUntil = nowFn() + PLAYER_LYRIC_USER_IDLE_MS;
    if (playerLyrics) {
      const currentOffset = getPlayerLyricTrackOffset();
      const isAlreadyManual = playerLyrics.classList?.contains?.("is-manual-preview");
      if (!isAlreadyManual && currentOffset > 0) {
        playerLyrics.scrollTop = currentOffset;
        setPlayerLyricTrackOffset(0);
      }
      playerLyrics.classList?.add("is-manual-preview");
    }
    updatePlayerLyricPreviewFromScroll();
    schedulePlayerLyricAutoResume();
  }

  function getPlayerLyricLine(index) {
    return activeLyrics[index] || null;
  }

  return {
    getActiveLyrics: () => activeLyrics,
    getActiveLyricIndex: () => activeLyricIndex,
    getActiveLyricTrackId: () => activeLyricTrackId,
    getLyricClockOverride: () => lyricClockOverride,
    getLyricIndexAt: getRuntimeLyricIndexAt,
    getPlayerLyricLine,
    getPlayerLyricUserScrollUntil: () => playerLyricUserScrollUntil,
    clearLyricClockOverride,
    handlePlayerLyricsPointerInteraction,
    handlePlayerLyricsScroll,
    loadLyricsForTrack,
    previewPlayerLyricIndex,
    renderLyric,
    renderLyricList,
    renderPlayerLyricsList,
    resetPlayerLyricUserScroll,
    centerActivePlayerLyric,
    setLyricClockOverride,
    syncPlayerLyrics,
    updateLyricPosition,
    updatePlayerLyricPosition
  };
}


