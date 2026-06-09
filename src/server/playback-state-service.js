function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createPlaybackStateService({
  playbackRepository,
  upsertTrack,
  upsertPlaylist,
  appendPlaylistTracks,
  mapTrackRow,
  isLocalTrackLiked
}) {
  function normalizePlaybackTrack(track = {}, fallback = {}) {
    const sourceId = String(track.sourceId || track.source_id || fallback.sourceTrackId || "");
    const id = String(track.id || (sourceId ? `netease-track-${sourceId}` : ""));
    if (!id) return null;
    return {
      id,
      source: String(track.source || fallback.source || "netease"),
      sourceId,
      title: String(track.title || track.name || "未知歌曲"),
      artist: String(track.artist || ""),
      artistId: String(track.artistId || track.artist_id || ""),
      artists: Array.isArray(track.artists) ? track.artists : [],
      album: String(track.album || ""),
      albumId: String(track.albumId || track.album_id || ""),
      cover: String(track.cover || track.picUrl || ""),
      duration: Number(track.duration || fallback.duration || 0),
      src: String(track.src || ""),
      raw: track.raw || track
    };
  }

  function normalizePlaybackPlaylist(playlist = {}, tracks = []) {
    const sourceId = String(playlist.sourceId || playlist.source_id || "");
    const id = String(playlist.id || (sourceId ? `netease-playlist-${sourceId}` : ""));
    if (!id) return null;
    return {
      id,
      source: String(playlist.source || "netease"),
      sourceId,
      title: String(playlist.title || playlist.name || "网易云播放队列"),
      subtitle: String(playlist.subtitle || "网易云音乐"),
      description: String(playlist.description || `已缓存 ${tracks.length} 首歌，可离线恢复播放队列。`),
      cover: String(playlist.cover || playlist.coverImgUrl || tracks[0]?.cover || ""),
      trackCount: Number(playlist.trackCount || tracks.length || 0),
      displayOrder: Number(playlist.displayOrder || 0),
      tracks,
      raw: playlist.raw || playlist
    };
  }

  function isRealNeteasePlaylist(playlist = {}) {
    return playlist.source === "netease" && Boolean(playlist.sourceId);
  }

  function replacePlaybackQueueItems(queue = []) {
    playbackRepository.replaceQueueItems(queue, { upsertTrack });
  }

  function readPlaybackQueueItems() {
    return playbackRepository.readQueueItems()
      .map((row) => {
        const saved = parseJson(row.payloadJson, null);
        const local = mapTrackRow(row);
        const track = saved && typeof saved === "object" ? normalizePlaybackTrack(saved, row) : mapTrackRow(row);
        return track
          ? {
              ...(local || {}),
              ...track,
              src: track.src || local?.src || row.src || "",
              cover: track.cover || local?.cover || "",
              duration: Number(track.duration || local?.duration || 0),
              liked: track.source === "netease" ? isLocalTrackLiked(track.id, track.sourceId) : Boolean(track.liked)
            }
          : null;
      })
      .filter(Boolean);
  }

  function savePlaybackState(payload = {}) {
    const track = payload.track && typeof payload.track === "object" ? payload.track : {};
    const playlist = payload.playlist && typeof payload.playlist === "object" ? payload.playlist : {};
    const savedTrack = normalizePlaybackTrack(track, payload);
    const queue = Array.isArray(payload.queue)
      ? payload.queue.map((item) => normalizePlaybackTrack(item, payload)).filter(Boolean)
      : [];
    const playbackQueue = queue.length ? queue : (savedTrack ? [savedTrack] : []);
    const savedPlaylist = normalizePlaybackPlaylist(playlist, playbackQueue);
    if (savedTrack) {
      upsertTrack(savedTrack);
    }
    if (savedPlaylist && !isRealNeteasePlaylist(savedPlaylist)) {
      upsertPlaylist(savedPlaylist);
      if (playbackQueue.length) appendPlaylistTracks(savedPlaylist.id, playbackQueue);
    }
    replacePlaybackQueueItems(playbackQueue);
    playbackRepository.saveState({
      source: String(savedTrack?.source || track.source || payload.source || ""),
      trackId: String(savedTrack?.id || track.id || payload.trackId || ""),
      sourceTrackId: String(savedTrack?.sourceId || track.sourceId || payload.sourceTrackId || ""),
      playlistId: String(savedPlaylist?.id || playlist.id || payload.playlistId || ""),
      playlistSourceId: String(savedPlaylist?.sourceId || playlist.sourceId || payload.playlistSourceId || ""),
      position: Math.max(0, Number(payload.position || 0)),
      duration: Math.max(0, Number(payload.duration || savedTrack?.duration || track.duration || 0)),
      isPlaying: payload.isPlaying ? 1 : 0,
      payloadJson: JSON.stringify({
        ...payload,
        track: savedTrack || payload.track,
        playlist: savedPlaylist || payload.playlist,
        queue: playbackQueue
      })
    });
  }

  function readPlaybackState() {
    const row = playbackRepository.readState();
    if (!row) return null;
    return {
      source: row.source,
      trackId: row.trackId,
      sourceTrackId: row.sourceTrackId,
      playlistId: row.playlistId,
      playlistSourceId: row.playlistSourceId,
      position: row.position,
      duration: row.duration,
      isPlaying: row.isPlaying,
      payload: parseJson(row.payloadJson, {}),
      updatedAt: row.updatedAt
    };
  }

  return {
    normalizePlaybackTrack,
    normalizePlaybackPlaylist,
    isRealNeteasePlaylist,
    replacePlaybackQueueItems,
    readPlaybackQueueItems,
    savePlaybackState,
    readPlaybackState
  };
}
