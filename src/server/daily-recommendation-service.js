export function createDailyRecommendationService({
  dailyRecommendationRepository,
  normalizePlaybackTrack,
  mapTrackRow,
  upsertTrack,
  now = Date.now
}) {
  function getLocalDateKey(daysOffset = 0) {
    const date = new Date(Number(now()) + Number(daysOffset || 0) * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function normalizeDailyRecommendDate(value = "") {
    const input = String(value || "").trim().toLowerCase();
    if (input === "yesterday" || input === "history") return getLocalDateKey(-1);
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    return getLocalDateKey(0);
  }

  function getDailyRecommendDateFromKey(value = "") {
    const text = String(value || "");
    const matched = text.match(/\d{4}-\d{2}-\d{2}/);
    if (matched) return matched[0];
    if (text === "netease-daily-recommend") return getLocalDateKey(0);
    return "";
  }

  function cleanupDailyRecommendations() {
    return dailyRecommendationRepository.cleanup({ keepDates: [getLocalDateKey(0), getLocalDateKey(-1)] });
  }

  function getDailyRecommendPlaylistMeta(date, tracks = []) {
    const recommendDate = normalizeDailyRecommendDate(date);
    const isToday = recommendDate === getLocalDateKey(0);
    return {
      id: `netease-daily-recommend-${recommendDate}`,
      source: "netease",
      sourceId: `daily-${recommendDate}`,
      title: isToday ? "每日推荐" : "历史推荐",
      subtitle: "网易云每日推荐",
      description: isToday
        ? "网易云今天为你推荐的歌曲。"
        : "昨天保存下来的网易云每日推荐。",
      cover: tracks[0]?.cover || "",
      trackCount: tracks.length,
      displayOrder: 0,
      tracks,
      raw: {
        kind: "daily-recommendation",
        date: recommendDate
      }
    };
  }

  function getLocalDailyRecommendations(date = getLocalDateKey(0)) {
    cleanupDailyRecommendations();
    const recommendDate = normalizeDailyRecommendDate(date);
    return dailyRecommendationRepository.listByDate(recommendDate).map(mapTrackRow).filter(Boolean);
  }

  function getLocalDailyRecommendationPlaylist(date = getLocalDateKey(0)) {
    const recommendDate = normalizeDailyRecommendDate(date);
    const tracks = getLocalDailyRecommendations(recommendDate);
    if (!tracks.length) return null;
    return getDailyRecommendPlaylistMeta(recommendDate, tracks);
  }

  function replaceDailyRecommendations(date, tracks = []) {
    const recommendDate = normalizeDailyRecommendDate(date);
    const normalized = tracks.map((track) => normalizePlaybackTrack(track, { source: "netease" })).filter(Boolean);
    dailyRecommendationRepository.replace(recommendDate, normalized, { upsertTrack });
    cleanupDailyRecommendations();
    return getLocalDailyRecommendations(recommendDate);
  }

  function getPlaybackDailyRecommendationPlaylist(savedPlayback = {}) {
    const playlist = savedPlayback.payload?.playlist || {};
    const keys = [
      savedPlayback.playlistSourceId,
      savedPlayback.playlistId,
      playlist.sourceId,
      playlist.id
    ];
    const date = keys.map(getDailyRecommendDateFromKey).find(Boolean);
    return date ? getLocalDailyRecommendationPlaylist(date) : null;
  }

  return {
    getLocalDateKey,
    normalizeDailyRecommendDate,
    getDailyRecommendDateFromKey,
    cleanupDailyRecommendations,
    getDailyRecommendPlaylistMeta,
    getLocalDailyRecommendations,
    getLocalDailyRecommendationPlaylist,
    replaceDailyRecommendations,
    getPlaybackDailyRecommendationPlaylist
  };
}
