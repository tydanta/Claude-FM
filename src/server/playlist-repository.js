export function createPlaylistRepository(db) {
  const upsertPlaylist = db.prepare(`
    INSERT INTO playlists (
      id, source, source_id, owner_user_id, title, subtitle, description, cover,
      track_count, display_order, raw_json, updated_at
    )
    VALUES (
      @id, @source, @sourceId, @ownerUserId, @title, @subtitle, @description, @cover,
      @trackCount, @displayOrder, @rawJson, CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      title = excluded.title,
      subtitle = excluded.subtitle,
      description = excluded.description,
      cover = excluded.cover,
      track_count = excluded.track_count,
      display_order = excluded.display_order,
      raw_json = excluded.raw_json,
      updated_at = CURRENT_TIMESTAMP
  `);
  const clearPlaylistTracks = db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ?");
  const insertOrReplaceTrack = db.prepare(`
    INSERT OR REPLACE INTO playlist_tracks (playlist_id, track_id, position, source_track_id, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const insertOrIgnoreTrack = db.prepare(`
    INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position, source_track_id, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const maxPosition = db.prepare("SELECT COALESCE(MAX(position), -1) AS position FROM playlist_tracks WHERE playlist_id = ?");
  const refreshTrackCount = db.prepare(`
    UPDATE playlists
    SET track_count = MAX(track_count, (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?)),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const listPlaylists = db.prepare(`
    SELECT playlists.*,
      (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_tracks.playlist_id = playlists.id) AS cached_track_count
    FROM playlists
    WHERE source = 'netease'
      AND (@ownerUserId = '' OR owner_user_id = @ownerUserId)
    ORDER BY display_order ASC, updated_at DESC, title COLLATE NOCASE ASC
  `);
  const getPlaylist = db.prepare(`
    SELECT *
    FROM playlists
    WHERE source = 'netease'
      AND (source_id = @key OR id = @key)
      AND (@ownerUserId = '' OR owner_user_id = @ownerUserId)
    LIMIT 1
  `);
  const getPlaylistTracksById = db.prepare(`
    SELECT tracks.*
    FROM playlist_tracks
    JOIN tracks ON tracks.id = playlist_tracks.track_id
    WHERE playlist_tracks.playlist_id = ?
    ORDER BY playlist_tracks.position ASC
  `);
  const findLikedPlaylistQuery = db.prepare(`
    SELECT *
    FROM playlists
    WHERE source = 'netease'
      AND (@ownerUserId = '' OR owner_user_id = @ownerUserId)
      AND (display_order < 0 OR title LIKE '%喜欢的音乐%' OR title LIKE '%鍠滄鐨勯煶涔?')
    ORDER BY display_order ASC, updated_at DESC
    LIMIT 1
  `);
  const findForTrackQuery = db.prepare(`
    SELECT playlists.*
    FROM playlist_tracks
    JOIN tracks ON tracks.id = playlist_tracks.track_id
    JOIN playlists ON playlists.id = playlist_tracks.playlist_id
    WHERE playlists.source = 'netease'
      AND (@ownerUserId = '' OR playlists.owner_user_id = @ownerUserId)
      AND (
        playlist_tracks.track_id = @trackId
        OR playlist_tracks.source_track_id = @sourceTrackId
        OR tracks.source_id = @sourceTrackId
      )
    ORDER BY
      CASE WHEN playlists.display_order < 0 THEN 0 ELSE 1 END ASC,
      playlists.display_order ASC,
      playlists.updated_at DESC
    LIMIT 1
  `);
  const firstCover = db.prepare(`
    SELECT tracks.cover
    FROM playlist_tracks
    JOIN tracks ON tracks.id = playlist_tracks.track_id
    WHERE playlist_tracks.playlist_id = ?
    ORDER BY playlist_tracks.position ASC
    LIMIT 1
  `);
  const trackCount = db.prepare("SELECT COUNT(*) AS count FROM playlist_tracks WHERE playlist_id = ?");
  const updateSummary = db.prepare(`
    UPDATE playlists
    SET track_count = ?,
        cover = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const deletePlaylistTrack = db.prepare("DELETE FROM playlist_tracks WHERE playlist_id = ? AND source_track_id = ?");
  const shiftPositions = db.prepare("UPDATE playlist_tracks SET position = position + ? WHERE playlist_id = ?");
  const existingPlaylistTrack = db.prepare(`
    SELECT 1 FROM playlist_tracks
    WHERE playlist_id = ? AND (track_id = ? OR source_track_id = ?)
    LIMIT 1
  `);

  function toPlaylistRecord(playlist = {}) {
    return {
      ...playlist,
      sourceId: playlist.sourceId || playlist.source_id || "",
      ownerUserId: String(playlist.ownerUserId || playlist.owner_user_id || ""),
      trackCount: Number(playlist.trackCount ?? playlist.track_count ?? 0),
      displayOrder: Number(playlist.displayOrder ?? playlist.display_order ?? 0),
      rawJson: JSON.stringify(playlist.raw || {})
    };
  }

  function upsert(playlist = {}) {
    upsertPlaylist.run(toPlaylistRecord(playlist));
  }

  function list({ ownerUserId = "" } = {}) {
    return listPlaylists.all({ ownerUserId: String(ownerUserId || "") });
  }

  function getDetail(playlistId = "", { ownerUserId = "" } = {}) {
    const key = String(playlistId || "");
    const playlist = getPlaylist.get({ key, ownerUserId: String(ownerUserId || "") });
    if (!playlist) return null;
    return {
      playlist,
      trackRows: getPlaylistTracksById.all(playlist.id)
    };
  }

  function findLikedPlaylist({ ownerUserId = "" } = {}) {
    const playlist = findLikedPlaylistQuery.get({ ownerUserId: String(ownerUserId || "") });
    if (!playlist) return null;
    return {
      playlist,
      trackRows: getPlaylistTracksById.all(playlist.id)
    };
  }

  function findForTrack({ trackId = "", sourceTrackId = "", ownerUserId = "" } = {}) {
    const playlist = findForTrackQuery.get({
      trackId: String(trackId || ""),
      sourceTrackId: String(sourceTrackId || ""),
      ownerUserId: String(ownerUserId || "")
    });
    if (!playlist) return null;
    return {
      playlist,
      trackRows: getPlaylistTracksById.all(playlist.id)
    };
  }

  function replaceTracks(playlistId = "", tracks = [], { upsertTrack } = {}) {
    if (typeof upsertTrack !== "function") {
      throw new TypeError("replaceTracks requires an upsertTrack function");
    }
    const id = String(playlistId || "");
    const tx = db.transaction(() => {
      clearPlaylistTracks.run(id);
      tracks.forEach((track, index) => {
        upsertTrack(track);
        insertOrReplaceTrack.run(id, track.id, index, track.sourceId);
      });
    });
    tx();
  }

  function appendTracks(playlistId = "", tracks = [], { upsertTrack, ownerUserId = "" } = {}) {
    if (typeof upsertTrack !== "function") {
      throw new TypeError("appendTracks requires an upsertTrack function");
    }
    const detail = getDetail(playlistId, { ownerUserId });
    if (!detail?.playlist?.id || !tracks?.length) return 0;
    let changed = 0;
    const tx = db.transaction(() => {
      let nextPosition = Number(maxPosition.get(detail.playlist.id)?.position ?? -1) + 1;
      tracks.forEach((track) => {
        upsertTrack(track);
        const result = insertOrIgnoreTrack.run(detail.playlist.id, track.id, nextPosition, track.sourceId);
        if (result.changes) {
          nextPosition += 1;
          changed += result.changes;
        }
      });
    });
    tx();
    if (changed) refreshTrackCount.run(detail.playlist.id, detail.playlist.id);
    return changed;
  }

  function updatePlaylistSummary(playlistId = "") {
    const id = String(playlistId || "");
    const row = firstCover.get(id);
    const count = Number(trackCount.get(id)?.count || 0);
    updateSummary.run(count, row?.cover || "", id);
    return count;
  }

  function updateTracks({
    playlistId = "",
    songIds = [],
    op = "add",
    placement = "append",
    ownerUserId = "",
    getTrackBySourceId
  } = {}) {
    const detail = getDetail(playlistId, { ownerUserId });
    if (!detail?.playlist?.id) return 0;
    if (typeof getTrackBySourceId !== "function") {
      throw new TypeError("updateTracks requires a getTrackBySourceId function");
    }
    const ids = [...new Set((Array.isArray(songIds) ? songIds : String(songIds || "").split(","))
      .map((id) => String(id || "").trim())
      .filter(Boolean))];
    if (!ids.length) return 0;
    let changed = 0;
    const tx = db.transaction(() => {
      let nextPosition = Number(maxPosition.get(detail.playlist.id)?.position ?? -1) + 1;
      const prependTracks = [];
      for (const songId of ids) {
        if (op === "del") {
          changed += deletePlaylistTrack.run(detail.playlist.id, songId).changes || 0;
          continue;
        }
        const track = getTrackBySourceId(songId);
        if (!track) continue;
        const exists = existingPlaylistTrack.get(detail.playlist.id, track.id, songId);
        if (placement === "prepend") {
          if (exists) {
            deletePlaylistTrack.run(detail.playlist.id, songId);
          } else {
            changed += 1;
          }
          prependTracks.push({ track, songId });
          continue;
        }
        if (exists) continue;
        insertOrReplaceTrack.run(detail.playlist.id, track.id, nextPosition, songId);
        nextPosition += 1;
        changed += 1;
      }
      if (prependTracks.length) {
        shiftPositions.run(prependTracks.length, detail.playlist.id);
        prependTracks.forEach(({ track, songId }, index) => {
          insertOrReplaceTrack.run(detail.playlist.id, track.id, index, songId);
        });
      }
    });
    tx();
    if (changed || placement === "prepend") {
      updatePlaylistSummary(detail.playlist.id);
    }
    return changed;
  }

  return {
    upsert,
    list,
    getDetail,
    findLikedPlaylist,
    findForTrack,
    replaceTracks,
    appendTracks,
    updatePlaylistSummary,
    updateTracks
  };
}
