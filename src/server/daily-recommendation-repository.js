export function createDailyRecommendationRepository(db) {
  const cleanupExceptDates = db.prepare(`
    DELETE FROM daily_recommend_tracks
    WHERE recommend_date NOT IN (?, ?)
  `);
  const listByDateQuery = db.prepare(`
    SELECT tracks.*
    FROM daily_recommend_tracks
    JOIN tracks ON tracks.id = daily_recommend_tracks.track_id
    WHERE daily_recommend_tracks.recommend_date = ?
    ORDER BY daily_recommend_tracks.position ASC
  `);
  const removeByDate = db.prepare("DELETE FROM daily_recommend_tracks WHERE recommend_date = ?");
  const insertTrack = db.prepare(`
    INSERT OR REPLACE INTO daily_recommend_tracks (recommend_date, track_id, position, source_track_id, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  function cleanup({ keepDates = [] } = {}) {
    const dates = Array.isArray(keepDates) ? keepDates.map((date) => String(date || "")).filter(Boolean) : [];
    if (dates.length < 2) {
      throw new TypeError("cleanup requires two keepDates");
    }
    // 每日推荐只保留今天和昨天：既能恢复最近播放，又避免 APK 本地数据库长期膨胀。
    return cleanupExceptDates.run(dates[0], dates[1]).changes || 0;
  }

  function listByDate(date = "") {
    return listByDateQuery.all(String(date || ""));
  }

  function replace(date = "", tracks = [], { upsertTrack } = {}) {
    if (typeof upsertTrack !== "function") {
      throw new TypeError("replace requires an upsertTrack function");
    }
    const recommendDate = String(date || "");
    const tx = db.transaction(() => {
      removeByDate.run(recommendDate);
      tracks.forEach((track, index) => {
        if (!track?.id) return;
        upsertTrack(track);
        insertTrack.run(recommendDate, track.id, index, track.sourceId || "");
      });
    });
    tx();
  }

  return {
    cleanup,
    listByDate,
    replace
  };
}
