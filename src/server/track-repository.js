function escapeLikeQuery(value = "") {
  return String(value || "").replace(/[%_]/g, "\\$&");
}

export function createTrackRepository(db) {
  const upsertTrack = db.prepare(`
    INSERT INTO tracks (id, source, source_id, title, artist, artist_id, album, album_id, cover, duration, src, raw_json, updated_at)
    VALUES (@id, @source, @sourceId, @title, @artist, @artistId, @album, @albumId, @cover, @duration, @src, @rawJson, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      artist_id = excluded.artist_id,
      album = excluded.album,
      album_id = excluded.album_id,
      cover = excluded.cover,
      duration = excluded.duration,
      src = COALESCE(NULLIF(excluded.src, ''), tracks.src),
      raw_json = excluded.raw_json,
      updated_at = CURRENT_TIMESTAMP
  `);
  const findByIdQuery = db.prepare("SELECT * FROM tracks WHERE id = ? LIMIT 1");
  const findBySourceIdQuery = db.prepare("SELECT * FROM tracks WHERE source = 'netease' AND source_id = ? LIMIT 1");
  const listLikedQuery = db.prepare(`
    SELECT tracks.*
    FROM likes
    JOIN tracks ON tracks.id = likes.track_id
    WHERE likes.source = 'netease'
    ORDER BY likes.liked_at DESC
  `);
  const searchNeteaseQuery = db.prepare(`
    SELECT *
    FROM tracks
    WHERE source = 'netease'
      AND (title LIKE ? ESCAPE '\\' OR artist LIKE ? ESCAPE '\\' OR album LIKE ? ESCAPE '\\')
    ORDER BY updated_at DESC, title COLLATE NOCASE ASC
    LIMIT ?
  `);
  const findArtistByIdQuery = db.prepare(`
    SELECT *
    FROM tracks
    WHERE source = 'netease' AND artist_id = ?
    ORDER BY updated_at DESC, title COLLATE NOCASE ASC
    LIMIT 50
  `);
  const findArtistByNameQuery = db.prepare(`
    SELECT *
    FROM tracks
    WHERE source = 'netease' AND artist LIKE ? ESCAPE '\\'
    ORDER BY updated_at DESC, title COLLATE NOCASE ASC
    LIMIT 50
  `);
  const likedDirectQuery = db.prepare(`
    SELECT 1
    FROM likes
    WHERE track_id = @trackId OR source_id = @sourceTrackId
    LIMIT 1
  `);
  const likedPlaylistQuery = db.prepare(`
    SELECT 1
    FROM playlist_tracks
    JOIN playlists ON playlists.id = playlist_tracks.playlist_id
    WHERE playlists.source = 'netease'
      AND (playlists.display_order < 0 OR playlists.title LIKE '%喜欢的音乐%')
      AND (playlist_tracks.track_id = @trackId OR playlist_tracks.source_track_id = @sourceTrackId)
    LIMIT 1
  `);
  const insertLike = db.prepare(`
    INSERT OR REPLACE INTO likes (track_id, source, source_id, liked_at)
    VALUES (?, 'netease', ?, CURRENT_TIMESTAMP)
  `);
  const deleteLike = db.prepare("DELETE FROM likes WHERE track_id = ? OR source_id = ?");
  const updateSrcQuery = db.prepare("UPDATE tracks SET src = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");

  function upsert(track = {}) {
    upsertTrack.run({
      ...track,
      sourceId: track.sourceId || track.source_id || "",
      artistId: track.artistId || track.artist_id || "",
      albumId: track.albumId || track.album_id || "",
      rawJson: JSON.stringify(track.raw || {})
    });
  }

  function findById(trackId) {
    return findByIdQuery.get(String(trackId || ""));
  }

  function findBySourceId(sourceId) {
    return findBySourceIdQuery.get(String(sourceId || ""));
  }

  function listLiked() {
    return listLikedQuery.all();
  }

  function searchNetease(keywords = "", limit = 30) {
    const query = String(keywords || "").trim();
    if (!query) return [];
    const like = `%${escapeLikeQuery(query)}%`;
    return searchNeteaseQuery.all(like, like, like, Math.max(1, Math.min(100, Number(limit) || 30)));
  }

  function findNeteaseArtistTracks({ id = "", name = "" } = {}) {
    const artistId = String(id || "");
    if (artistId) {
      const rows = findArtistByIdQuery.all(artistId);
      if (rows.length) return rows;
    }
    const artistName = String(name || "").trim();
    if (!artistName) return [];
    return findArtistByNameQuery.all(`%${escapeLikeQuery(artistName)}%`);
  }

  function isLiked(trackId = "", sourceTrackId = "") {
    const params = {
      trackId: String(trackId || ""),
      sourceTrackId: String(sourceTrackId || "")
    };
    return Boolean(likedDirectQuery.get(params) || likedPlaylistQuery.get(params));
  }

  function setLike(trackId = "", sourceTrackId = "", liked = true) {
    const id = String(trackId || "");
    const sourceId = String(sourceTrackId || "");
    if (liked) {
      return insertLike.run(id, sourceId).changes || 0;
    }
    return deleteLike.run(id, sourceId).changes || 0;
  }

  function updateSrc(trackId = "", src = "") {
    return updateSrcQuery.run(String(src || ""), String(trackId || "")).changes || 0;
  }

  return {
    upsert,
    findById,
    findBySourceId,
    listLiked,
    searchNetease,
    findNeteaseArtistTracks,
    isLiked,
    setLike,
    updateSrc
  };
}
