import { hydrateLazyBackgrounds } from "../ui/lazyBackgrounds.js";

function normalizeAlbumElements(elements = {}) {
  return {
    albumPage: elements.albumPage,
    albumHeroCover: elements.albumHeroCover,
    albumHeroTitle: elements.albumHeroTitle,
    albumHeroDesc: elements.albumHeroDesc,
    albumTrackList: elements.albumTrackList
  };
}

function getAlbumTitle(album = {}, fallback = "") {
  return album.name || album.title || fallback || "专辑";
}

function getAlbumDescription(album = {}, tracks = []) {
  const description = String(album.description || album.desc || album.briefDesc || "").trim();
  if (description) return description;
  const artist = album.artist?.name || album.artists?.map?.((item) => item.name).filter(Boolean).join(" / ") || "";
  const count = album.size || tracks.length || 0;
  return [artist, count ? `${count} 首` : ""].filter(Boolean).join(" · ") || "专辑详情";
}

export function createAlbumController({
  elements = {},
  neteaseApi,
  setAppPage = () => {},
  getNeteaseCoverProxyUrl = (cover) => cover,
  renderTrackRow = () => "",
  findTrackIndex = () => -1,
  onOpenAlbumPage = () => {}
} = {}) {
  const {
    albumPage,
    albumHeroCover,
    albumHeroTitle,
    albumHeroDesc,
    albumTrackList
  } = normalizeAlbumElements(elements);

  let activeAlbumId = "";
  let activeAlbumTracks = [];
  let activeAlbum = null;
  let albumRequestId = 0;

  async function openAlbumPage({ id = "", name = "" } = {}) {
    const albumId = String(id || "").trim();
    const fallbackName = String(name || "").trim();
    if (!albumId) return;
    const requestId = albumRequestId + 1;
    albumRequestId = requestId;
    activeAlbumId = albumId;
    activeAlbumTracks = [];
    activeAlbum = null;
    onOpenAlbumPage();
    if (albumPage) albumPage.hidden = false;
    if (albumHeroTitle) albumHeroTitle.textContent = fallbackName || "专辑";
    if (albumHeroDesc) albumHeroDesc.textContent = "正在加载专辑歌曲...";
    if (albumHeroCover) albumHeroCover.style.backgroundImage = "";
    if (albumTrackList) albumTrackList.innerHTML = `<div class="mine-empty">正在加载专辑歌曲...</div>`;
    setAppPage("album");

    const data = await neteaseApi.getAlbum({ id: albumId });
    if (albumRequestId !== requestId) return;
    const album = data.album || {};
    const tracks = data.tracks || data.songs || [];
    activeAlbum = album;
    activeAlbumTracks = tracks;
    if (albumHeroTitle) albumHeroTitle.textContent = getAlbumTitle(album, fallbackName);
    if (albumHeroDesc) albumHeroDesc.textContent = getAlbumDescription(album, tracks);
    const cover = album.picUrl || album.coverImgUrl || album.cover || tracks[0]?.cover || "";
    if (albumHeroCover) {
      albumHeroCover.style.backgroundImage = cover ? `url("${getNeteaseCoverProxyUrl(cover, "detail")}")` : "";
    }
    if (!albumTrackList) return;
    if (!tracks.length) {
      albumTrackList.innerHTML = `<div class="mine-empty">这张专辑暂无可播放歌曲</div>`;
      return;
    }
    albumTrackList.innerHTML = tracks
      .map((track, index) => renderTrackRow(track, index, {
        queueIndex: findTrackIndex(track.id),
        actionLabel: "播放",
        actionButtons: ["next", "collect"]
      }))
      .join("");
    hydrateLazyBackgrounds(albumTrackList);
  }

  function resetAlbumState() {
    activeAlbumId = "";
    activeAlbumTracks = [];
    activeAlbum = null;
  }

  return {
    getActiveAlbum: () => activeAlbum,
    getActiveAlbumId: () => activeAlbumId,
    getActiveAlbumTracks: () => activeAlbumTracks,
    openAlbumPage,
    resetAlbumState
  };
}
