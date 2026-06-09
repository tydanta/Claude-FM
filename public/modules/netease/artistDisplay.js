export function getTrackArtists(track) {
  const artists = Array.isArray(track?.artists) ? track.artists : [];
  if (artists.length) {
    return artists
      .map((artist) => ({
        id: String(artist?.id || ""),
        name: String(artist?.name || "").trim()
      }))
      .filter((artist) => artist.name);
  }
  const names = String(track?.artist || "")
    .split(/\s*\/\s*/)
    .map((name) => name.trim())
    .filter(Boolean);
  // 老数据只有 artist 字符串时，仅第一个歌手继承 artistId，避免多个名字误指向同一主页。
  return names.length
    ? names.map((name, index) => ({ id: index === 0 ? String(track?.artistId || "") : "", name }))
    : [{ id: String(track?.artistId || ""), name: "未知歌手" }];
}
