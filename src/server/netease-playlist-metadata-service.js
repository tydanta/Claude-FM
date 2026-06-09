export function createNeteasePlaylistMetadataService({
  getLocalNeteasePlaylistDetail,
  upsertPlaylist,
  neteaseRequest,
  normalizeNeteasePlaylist
}) {
  function ensurePlaybackPlaylist(playlist) {
    if (!playlist?.id) return null;
    const playlistKey = playlist.sourceId || playlist.id;
    const existing = getLocalNeteasePlaylistDetail(playlistKey, { ownerUserId: playlist.ownerUserId || "" });
    if (existing?.id) return existing;
    upsertPlaylist({
      ...playlist,
      trackCount: Number(playlist.trackCount || playlist.tracks?.length || 0)
    });
    return getLocalNeteasePlaylistDetail(playlistKey, { ownerUserId: playlist.ownerUserId || "" });
  }

  async function refreshNeteasePlaylistMetadata(playlist) {
    if (!playlist?.sourceId) return playlist;
    const detail = await neteaseRequest("/playlist/detail", { id: playlist.sourceId }, { auth: true }).catch(() => null);
    const raw = detail?.playlist;
    if (!raw) return playlist;
    const next = normalizeNeteasePlaylist(raw, playlist.tracks || [], playlist.displayOrder || 0, playlist.ownerUserId || "");
    upsertPlaylist(next);
    return {
      ...playlist,
      ...next,
      tracks: playlist.tracks || []
    };
  }

  return {
    ensurePlaybackPlaylist,
    refreshNeteasePlaylistMetadata
  };
}
