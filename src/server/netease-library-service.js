function normalizeArtist(artist) {
  if (!artist) return { name: "", id: "" };
  if (typeof artist === "string") return { name: artist, id: "" };
  return {
    name: artist.name || "",
    id: artist.id !== undefined ? String(artist.id) : ""
  };
}

function normalizeArtists(value) {
  const artists = Array.isArray(value) ? value : (value ? [value] : []);
  return artists
    .map(normalizeArtist)
    .filter((artist) => artist.name);
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function playlistDescription(playlist = {}, trackCount = 0) {
  const description = String(playlist.description || playlist.copywriter || "").trim();
  if (description) return description;
  const tags = Array.isArray(playlist.tags) ? playlist.tags.filter(Boolean).join(" / ") : "";
  if (tags) return `${tags} · 共 ${trackCount || playlist.trackCount || 0} 首歌`;
  return `共 ${trackCount || playlist.trackCount || 0} 首歌，来自网易云音乐。`;
}

function isLikedNeteasePlaylist(playlist = {}) {
  const name = String(playlist.name || "").trim();
  return name.includes("我喜欢的音乐") || Number(playlist.specialType) === 5;
}

function normalizeNeteaseTrack(song = {}) {
  const album = song.al || song.album || {};
  const artists = normalizeArtists(song.ar || song.artists || []);
  const firstArtist = artists[0] || { name: "", id: "" };
  const artistName = artists.map((artist) => artist.name).filter(Boolean).join(" / ");
  const sourceId = String(song.id || song.songId || "");
  return {
    id: `netease-${sourceId}`,
    source: "netease",
    sourceId,
    title: song.name || song.title || "未知歌曲",
    artist: artistName || "未知歌手",
    artistId: firstArtist.id,
    artists,
    album: album.name || "",
    albumId: album.id !== undefined ? String(album.id) : "",
    cover: album.picUrl || album.pic || song.picUrl || "",
    duration: Math.round(Number(song.dt || song.duration || 0) / 1000),
    src: "",
    mood: "网易云",
    reason: "来自网易云音乐歌单。",
    raw: song
  };
}

function normalizeOwnerPlaylistId(sourceId = "", ownerUserId = "") {
  const owner = String(ownerUserId || "").trim();
  return owner
    ? `netease-user-${owner}-playlist-${sourceId}`
    : `netease-playlist-${sourceId}`;
}

function normalizeNeteasePlaylist(playlist = {}, tracks = [], displayOrder = 0, ownerUserId = "") {
  const sourceId = String(playlist.id || "");
  return {
    id: normalizeOwnerPlaylistId(sourceId, ownerUserId),
    source: "netease",
    sourceId,
    ownerUserId: String(ownerUserId || ""),
    title: playlist.name || "网易云歌单",
    subtitle: playlist.creator?.nickname || "网易云音乐",
    description: playlistDescription(playlist, tracks.length),
    cover: playlist.coverImgUrl || playlist.picUrl || "",
    trackCount: Number(playlist.trackCount || tracks.length || 0),
    displayOrder,
    tracks,
    raw: playlist
  };
}

function isGenericPlaylistDescription(description = "") {
  const value = String(description || "").trim();
  return !value || value === "从网易云同步的歌单。" || /^共\s*\d+\s*首歌，来自网易云音乐。$/.test(value);
}

export function createNeteaseLibraryService({
  db,
  trackRepository,
  playlistRepository
}) {
  function upsertTrack(track) {
    trackRepository.upsert(track);
  }

  function upsertPlaylist(playlist) {
    playlistRepository.upsert(playlist);
  }

  function replacePlaylistTracks(playlistId, tracks) {
    playlistRepository.replaceTracks(playlistId, tracks, { upsertTrack });
  }

  function appendPlaylistTracks(playlistId, tracks, { ownerUserId = "" } = {}) {
    return playlistRepository.appendTracks(playlistId, tracks, { upsertTrack, ownerUserId });
  }

  function mapPlaylistRow(row, tracks = []) {
    if (!row) return null;
    const raw = parseJson(row.raw_json, {});
    const trackCount = Number(row.track_count || tracks.length || 0);
    const cachedTrackCount = Number(row.cached_track_count || tracks.length || 0);
    const savedDescription = String(row.description || "").trim();
    const hasUsefulDescription = savedDescription && savedDescription !== "从网易云同步的歌单。";
    return {
      id: row.id,
      source: row.source,
      sourceId: row.source_id,
      ownerUserId: row.owner_user_id || "",
      title: row.title,
      subtitle: row.subtitle || raw.creator?.nickname || "网易云音乐",
      description: hasUsefulDescription ? savedDescription : playlistDescription(raw, trackCount),
      cover: row.cover || raw.coverImgUrl || raw.picUrl || "",
      trackCount,
      cachedTrackCount,
      displayOrder: Number(row.display_order || 0),
      tracks,
      raw
    };
  }

  function mapTrackRow(row) {
    if (!row) return null;
    const raw = parseJson(row.raw_json, {});
    const artists = normalizeArtists(raw.ar || raw.artists || []);
    const sourceId = row.source_id || "";
    return {
      id: row.id,
      source: row.source,
      sourceId,
      title: row.title,
      artist: row.artist || "未知歌手",
      artistId: row.artist_id || "",
      artists: artists.length ? artists : [{ name: row.artist || "未知歌手", id: row.artist_id || "" }],
      album: row.album || "",
      albumId: row.album_id || "",
      cover: row.cover || "",
      duration: Number(row.duration || 0),
      src: row.src || "",
      liked: row.source === "netease" ? isLocalTrackLiked(row.id, sourceId) : false,
      mood: row.source === "netease" ? "网易云" : "",
      reason: row.source === "netease" ? "来自网易云音乐歌单。" : "",
      raw
    };
  }

  function getLocalTrackById(trackId) {
    return mapTrackRow(trackRepository.findById(trackId));
  }

  function getLocalTrackBySourceId(sourceId) {
    return mapTrackRow(trackRepository.findBySourceId(sourceId));
  }

  function getLocalLikedTracks() {
    return trackRepository.listLiked().map(mapTrackRow).filter(Boolean);
  }

  function getLocalNeteaseTrackSearch(keywords = "", limit = 30) {
    return trackRepository.searchNetease(keywords, limit).map(mapTrackRow).filter(Boolean);
  }

  function getLocalNeteaseArtistPage({ id = "", name = "" } = {}) {
    const artistId = String(id || "");
    const artistName = String(name || "").trim();
    const rows = trackRepository.findNeteaseArtistTracks({ id: artistId, name: artistName });
    const songs = rows.map(mapTrackRow).filter(Boolean);
    const first = songs[0];
    return {
      artistId: artistId || first?.artistId || "",
      artist: {
        id: artistId || first?.artistId || "",
        name: artistName || first?.artist || "歌手",
        briefDesc: "当前处于离线模式，先展示本地数据库里已经保存的歌曲。",
        picUrl: first?.cover || ""
      },
      songs,
      albums: []
    };
  }

  function getLocalNeteasePlaylists({ ownerUserId = "" } = {}) {
    return playlistRepository.list({ ownerUserId }).map((row) => mapPlaylistRow(row)).filter(Boolean);
  }

  function getLocalNeteasePlaylistDetail(playlistId, { ownerUserId = "" } = {}) {
    const detail = playlistRepository.getDetail(playlistId, { ownerUserId });
    return detail ? mapPlaylistRow(detail.playlist, detail.trackRows.map(mapTrackRow).filter(Boolean)) : null;
  }

  function getLocalLikedNeteasePlaylist({ ownerUserId = "" } = {}) {
    const detail = playlistRepository.findLikedPlaylist({ ownerUserId });
    return detail ? mapPlaylistRow(detail.playlist, detail.trackRows.map(mapTrackRow).filter(Boolean)) : null;
  }

  function isLocalTrackLiked(trackId = "", sourceTrackId = "") {
    return trackRepository.isLiked(trackId, sourceTrackId);
  }

  function findLocalNeteasePlaylistForTrack({ trackId = "", sourceTrackId = "", ownerUserId = "" } = {}) {
    const detail = playlistRepository.findForTrack({ trackId, sourceTrackId, ownerUserId });
    return detail ? mapPlaylistRow(detail.playlist, detail.trackRows.map(mapTrackRow).filter(Boolean)) : null;
  }

  function updateLocalPlaylistSummary(playlistId) {
    return playlistRepository.updatePlaylistSummary(playlistId);
  }

  function updateLocalPlaylistTracks({ playlistId = "", songIds = [], op = "add", placement = "append", ownerUserId = "" } = {}) {
    return playlistRepository.updateTracks({
      playlistId,
      songIds,
      op,
      placement,
      ownerUserId,
      getTrackBySourceId: getLocalTrackBySourceId
    });
  }

  function updateLocalLikeState(songId = "", like = true, { ownerUserId = "" } = {}) {
    const track = getLocalTrackBySourceId(songId);
    if (!track?.id) return 0;
    trackRepository.setLike(track.id, songId, like);
    const likedPlaylist = getLocalLikedNeteasePlaylist({ ownerUserId });
    if (!likedPlaylist?.id) return 1;
    return 1 + updateLocalPlaylistTracks({
      playlistId: likedPlaylist.sourceId || likedPlaylist.id,
      songIds: [songId],
      op: like ? "add" : "del",
      placement: like ? "prepend" : "append",
      ownerUserId
    });
  }

  function enqueueSyncJob(type, payload) {
    return db.prepare("INSERT INTO sync_jobs (type, payload) VALUES (?, ?)").run(type, JSON.stringify(payload));
  }

  return {
    normalizeArtist,
    normalizeArtists,
    normalizeNeteaseTrack,
    normalizeNeteasePlaylist,
    normalizeOwnerPlaylistId,
    isLikedNeteasePlaylist,
    isGenericPlaylistDescription,
    playlistDescription,
    parseJson,
    mapPlaylistRow,
    mapTrackRow,
    upsertTrack,
    upsertPlaylist,
    replacePlaylistTracks,
    appendPlaylistTracks,
    getLocalTrackById,
    getLocalTrackBySourceId,
    getLocalLikedTracks,
    getLocalNeteaseTrackSearch,
    getLocalNeteaseArtistPage,
    getLocalNeteasePlaylists,
    getLocalNeteasePlaylistDetail,
    getLocalLikedNeteasePlaylist,
    isLocalTrackLiked,
    findLocalNeteasePlaylistForTrack,
    updateLocalPlaylistSummary,
    updateLocalPlaylistTracks,
    updateLocalLikeState,
    enqueueSyncJob
  };
}
