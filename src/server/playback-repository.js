export function createPlaybackRepository(db) {
  const clearQueue = db.prepare("DELETE FROM playback_queue_items");
  const insertQueueItem = db.prepare(`
    INSERT INTO playback_queue_items (position, track_id, source, source_track_id, payload_json, updated_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const readQueueRows = db.prepare(`
    SELECT playback_queue_items.payload_json AS payloadJson, tracks.*
    FROM playback_queue_items
    JOIN tracks ON tracks.id = playback_queue_items.track_id
    ORDER BY playback_queue_items.position ASC, playback_queue_items.id ASC
  `);
  const upsertState = db.prepare(`
    INSERT INTO playback_state (
      id, source, track_id, source_track_id, playlist_id, playlist_source_id,
      position, duration, is_playing, payload_json, updated_at
    )
    VALUES (1, @source, @trackId, @sourceTrackId, @playlistId, @playlistSourceId,
      @position, @duration, @isPlaying, @payloadJson, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      source = excluded.source,
      track_id = excluded.track_id,
      source_track_id = excluded.source_track_id,
      playlist_id = excluded.playlist_id,
      playlist_source_id = excluded.playlist_source_id,
      position = excluded.position,
      duration = excluded.duration,
      is_playing = excluded.is_playing,
      payload_json = excluded.payload_json,
      updated_at = CURRENT_TIMESTAMP
  `);
  const readStateRow = db.prepare("SELECT * FROM playback_state WHERE id = 1");

  const replaceQueueTx = db.transaction((items, upsertTrack) => {
    clearQueue.run();
    items.forEach((track, index) => {
      if (!track?.id) return;
      upsertTrack(track);
      // 队列表保存完整 payload，tracks 表保存可索引字段；恢复播放时两者合并，避免旧队列丢失网易云临时播放信息。
      insertQueueItem.run(
        index,
        track.id,
        track.source || "",
        track.sourceId || "",
        JSON.stringify(track)
      );
    });
  });

  function replaceQueueItems(queue = [], { upsertTrack } = {}) {
    if (typeof upsertTrack !== "function") {
      throw new TypeError("replaceQueueItems requires an upsertTrack function");
    }
    replaceQueueTx(Array.isArray(queue) ? queue : [], upsertTrack);
  }

  function readQueueItems() {
    return readQueueRows.all();
  }

  function saveState(record = {}) {
    upsertState.run({
      source: String(record.source || ""),
      trackId: String(record.trackId || ""),
      sourceTrackId: String(record.sourceTrackId || ""),
      playlistId: String(record.playlistId || ""),
      playlistSourceId: String(record.playlistSourceId || ""),
      position: Math.max(0, Number(record.position || 0)),
      duration: Math.max(0, Number(record.duration || 0)),
      isPlaying: record.isPlaying ? 1 : 0,
      payloadJson: String(record.payloadJson || "{}")
    });
  }

  function readState() {
    const row = readStateRow.get();
    if (!row) return null;
    return {
      source: row.source || "",
      trackId: row.track_id || "",
      sourceTrackId: row.source_track_id || "",
      playlistId: row.playlist_id || "",
      playlistSourceId: row.playlist_source_id || "",
      position: Number(row.position || 0),
      duration: Number(row.duration || 0),
      isPlaying: Boolean(row.is_playing),
      payloadJson: row.payload_json || "{}",
      updatedAt: row.updated_at
    };
  }

  return {
    replaceQueueItems,
    readQueueItems,
    saveState,
    readState
  };
}
