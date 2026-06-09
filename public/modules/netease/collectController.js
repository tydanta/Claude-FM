import {
  getCollectablePlaylists,
  renderCollectPlaylistCards
} from "./collectModal.js";

function normalizeCollectElements(elements = {}) {
  return {
    collectModal: elements.collectModal,
    collectModalTitle: elements.collectModalTitle,
    collectModalTrack: elements.collectModalTrack,
    collectPlaylistList: elements.collectPlaylistList
  };
}

export function createCollectController({
  elements = {},
  documentRef = document,
  neteaseApi,
  getTrackFromRow = (row) => row,
  getPlaylists = () => [],
  getCoverUrl = (cover) => cover,
  renderNotice = () => {},
  onCollected = async () => {}
} = {}) {
  const {
    collectModal,
    collectModalTitle,
    collectModalTrack,
    collectPlaylistList
  } = normalizeCollectElements(elements);

  let collectTargetTrack = null;

  function closeCollectModal() {
    if (!collectModal) return;
    collectModal.hidden = true;
    collectTargetTrack = null;
    documentRef.body.classList.remove("is-collect-modal-open");
  }

  function openCollectModal(row) {
    if (!collectModal || !collectPlaylistList) return false;
    const track = getTrackFromRow(row);
    if (!track?.sourceId) {
      renderNotice("这首歌暂时不能收藏到网易云歌单。", { key: "collect-unavailable" });
      return false;
    }
    const playlists = getCollectablePlaylists(getPlaylists());
    if (!playlists.length) {
      renderNotice("还没有同步到网易云歌单。", { key: "collect-no-playlist" });
      return false;
    }
    collectTargetTrack = track;
    if (collectModalTitle) collectModalTitle.textContent = "选择歌单";
    if (collectModalTrack) collectModalTrack.textContent = `正在收藏：${track.title} / ${track.artist}`;
    collectPlaylistList.innerHTML = renderCollectPlaylistCards(playlists, getCoverUrl);
    collectModal.hidden = false;
    documentRef.body.classList.add("is-collect-modal-open");
    return true;
  }

  async function collectTrackToPlaylist(playlistId, track = collectTargetTrack) {
    if (!track?.sourceId || !playlistId) return null;
    const playlist = getPlaylists().find((item) => String(item.sourceId || "") === String(playlistId));
    const data = await neteaseApi.collectTrack({ playlistId, track });
    await onCollected({ data, playlist, playlistId, track });
    closeCollectModal();
    return data;
  }

  async function handlePlaylistListClick(event) {
    const playlistButton = event.target.closest("[data-collect-playlist-id]");
    if (!playlistButton) return;
    playlistButton.setAttribute("aria-busy", "true");
    try {
      await collectTrackToPlaylist(playlistButton.dataset.collectPlaylistId);
    } catch (error) {
      playlistButton.removeAttribute("aria-busy");
      renderNotice("收藏到歌单失败，请稍后再试。", { key: "collect-error" });
    }
  }

  return {
    closeCollectModal,
    collectTrackToPlaylist,
    getCollectTargetTrack: () => collectTargetTrack,
    handlePlaylistListClick,
    openCollectModal
  };
}
