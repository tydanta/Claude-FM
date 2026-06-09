import { hydrateLazyBackgrounds } from "../ui/lazyBackgrounds.js";

export function createRecommendController({
  radioRecommendPanel,
  radioRecommendKicker,
  radioRecommendTitle,
  historyRecommendBtn,
  radioRecommendList,
  dailyRecommendMeta,
  dailyRecommendCover,
  dailyRecommendMonth,
  dailyRecommendDay,
  neteaseApi,
  closeTrackMenus = () => {},
  getNeteaseCoverProxyUrl = (cover) => cover,
  getRecommendPanelState = () => ({ songs: [], emptyText: "" }),
  renderTrackRow = () => "",
  prewarmVisibleCovers = () => {},
  now = () => new Date()
} = {}) {
  let dailySongs = [];
  let dailyDate = "";
  let dailyLoading = false;
  let historySongs = [];
  let historyDate = "";
  let historyLoading = false;

  function getClientDateKey(daysOffset = 0) {
    const date = new Date(now().getTime() + Number(daysOffset || 0) * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function renderDailyRecommendCard() {
    const current = now();
    if (dailyRecommendMonth) {
      dailyRecommendMonth.textContent = current.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    }
    if (dailyRecommendDay) {
      dailyRecommendDay.textContent = String(current.getDate()).padStart(2, "0");
    }
    const firstCover = dailySongs[0]?.cover || "";
    if (!dailyRecommendCover) return;
    if (firstCover) {
      const coverUrl = getNeteaseCoverProxyUrl(firstCover, "grid");
      dailyRecommendCover.style.backgroundImage = `linear-gradient(180deg, rgba(0, 0, 0, 0.06), rgba(0, 0, 0, 0.5)), url("${coverUrl.replace(/"/g, "%22")}")`;
      dailyRecommendCover.classList.add("has-cover");
    } else {
      dailyRecommendCover.style.backgroundImage = "";
      dailyRecommendCover.classList.remove("has-cover");
    }
  }

  function getRecommendPlaylist(type = "daily") {
    const isHistory = type === "history";
    const date = isHistory
      ? (historyDate || getClientDateKey(-1))
      : (dailyDate || getClientDateKey(0));
    const tracks = isHistory ? historySongs : dailySongs;
    return {
      id: `netease-daily-recommend-${date}`,
      source: "netease",
      sourceId: `daily-${date}`,
      title: isHistory ? "历史推荐" : "每日推荐",
      subtitle: "网易云每日推荐",
      description: isHistory ? "昨天保存下来的网易云每日推荐。" : "网易云今天为你推荐的歌曲。",
      cover: tracks[0]?.cover || "",
      trackCount: tracks.length,
      tracks
    };
  }

  function getRecommendTrackListForPanel() {
    return radioRecommendPanel?.dataset.recommendPanel === "history" ? historySongs : dailySongs;
  }

  function renderRadioRecommendPanel(type = "daily") {
    if (!radioRecommendPanel || !radioRecommendList) return;
    radioRecommendPanel.hidden = false;
    radioRecommendPanel.dataset.recommendPanel = type;
    closeTrackMenus();
    const songs = type === "history" ? historySongs : dailySongs;
    const loading = type === "history" ? historyLoading : dailyLoading;
    const panel = getRecommendPanelState({ type, songs, loading });
    if (historyRecommendBtn) {
      historyRecommendBtn.hidden = panel.historyButtonHidden;
      historyRecommendBtn.textContent = panel.historyButtonText;
    }

    if (radioRecommendKicker) radioRecommendKicker.textContent = panel.kicker;
    if (radioRecommendTitle) radioRecommendTitle.textContent = panel.title;
    if (panel.emptyText) {
      radioRecommendList.innerHTML = `<div class="mine-empty">${panel.emptyText}</div>`;
      return;
    }
    radioRecommendList.innerHTML = panel.songs
      .map((track, index) => renderTrackRow(track, index, { queueIndex: -1, actionLabel: "播放" }))
      .join("");
    hydrateLazyBackgrounds(radioRecommendList);
    radioRecommendList.dataset.coverPreloadOffset = "40";
    prewarmVisibleCovers(panel.songs, "list");
  }

  async function loadDailyRecommendSongs({ force = false } = {}) {
    if (dailyLoading) return;
    if (dailySongs.length && !force) {
      renderDailyRecommendCard();
      renderRadioRecommendPanel("daily");
      return;
    }
    dailyLoading = true;
    if (dailyRecommendMeta) dailyRecommendMeta.textContent = "正在读取今日推荐...";
    renderRadioRecommendPanel("daily");
    try {
      const data = await neteaseApi.getRecommendSongs({ limit: 50 });
      dailySongs = Array.isArray(data.songs) ? data.songs : [];
      dailyDate = data.date || getClientDateKey(0);
      renderDailyRecommendCard();
      if (dailyRecommendMeta) {
        dailyRecommendMeta.textContent = dailySongs.length
          ? `${dailySongs.length} 首今日推荐${data.source === "local" ? "（本地）" : ""}`
          : "今天还没有推荐歌曲";
      }
    } catch {
      if (dailyRecommendMeta) dailyRecommendMeta.textContent = "每日推荐读取失败";
      if (radioRecommendList) {
        radioRecommendList.innerHTML = `<div class="mine-empty">每日推荐暂时读取失败，请确认网易云登录状态。</div>`;
      }
      return;
    } finally {
      dailyLoading = false;
    }
    renderRadioRecommendPanel("daily");
  }

  async function loadHistoryRecommendSongs() {
    if (historyLoading) return;
    if (historySongs.length) {
      renderRadioRecommendPanel("history");
      return;
    }
    historyLoading = true;
    renderRadioRecommendPanel("history");
    try {
      const data = await neteaseApi.getRecommendSongs({ date: "yesterday", local: true, limit: 50 });
      historySongs = Array.isArray(data.songs) ? data.songs : [];
      historyDate = data.date || getClientDateKey(-1);
    } catch {
      if (radioRecommendList) radioRecommendList.innerHTML = `<div class="mine-empty">历史推荐暂时读取失败。</div>`;
      return;
    } finally {
      historyLoading = false;
    }
    renderRadioRecommendPanel("history");
  }

  return {
    getDailyRecommendSongs: () => dailySongs,
    getHistoryRecommendSongs: () => historySongs,
    getRecommendPlaylist,
    getRecommendTrackListForPanel,
    loadDailyRecommendSongs,
    loadHistoryRecommendSongs,
    renderDailyRecommendCard,
    renderRadioRecommendPanel
  };
}
