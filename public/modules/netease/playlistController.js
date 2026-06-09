import { hydrateLazyBackgrounds } from "../ui/lazyBackgrounds.js";

function normalizePlaylistElements(elements = {}) {
  return {
    minePlaylistList: elements.minePlaylistList,
    minePlaylistDetail: elements.minePlaylistDetail,
    mineArtistDetail: elements.mineArtistDetail,
    musicSearchPage: elements.musicSearchPage,
    artistTopbar: elements.artistTopbar,
    artistProfilePanel: elements.artistProfilePanel,
    userProfilePanel: elements.userProfilePanel,
    playlistNameSearch: elements.playlistNameSearch,
    playlistHeroCover: elements.playlistHeroCover,
    playlistHeroTitle: elements.playlistHeroTitle,
    playlistHeroDesc: elements.playlistHeroDesc,
    playlistTrackList: elements.playlistTrackList,
    playlistSearchBox: elements.playlistSearchBox,
    playlistSearchToggle: elements.playlistSearchToggle,
    playlistSearch: elements.playlistSearch,
    minePlaylistCount: elements.minePlaylistCount
  };
}

function shouldLoadPlaylistDetail(playlist, { refresh = false } = {}) {
  if (playlist?.source !== "netease") return false;
  if (refresh) return true;
  return !Array.isArray(playlist.tracks) || playlist.tracks.length === 0;
}

export function createPlaylistController({
  elements = {},
  getMinePlaylists = () => [],
  loadPlaylistDetail = async (playlist) => playlist,
  resetArtistState = () => {},
  getPlaylistCover = () => "",
  getPlaylistDescription = () => "",
  renderTrackRow = () => "",
  findTrackIndex = () => -1,
  documentRef = document
} = {}) {
  const {
    minePlaylistList,
    minePlaylistDetail,
    mineArtistDetail,
    musicSearchPage,
    artistTopbar,
    artistProfilePanel,
    userProfilePanel,
    playlistNameSearch,
    playlistHeroCover,
    playlistHeroTitle,
    playlistHeroDesc,
    playlistTrackList,
    playlistSearchBox,
    playlistSearchToggle,
    playlistSearch,
    minePlaylistCount
  } = normalizePlaylistElements(elements);

  let activeMinePlaylistId = "";
  let activeNeteasePlaylist = null;

  function findMinePlaylistById(playlistId) {
    return getMinePlaylists().find((item) =>
      String(item.id) === String(playlistId) || String(item.sourceId || "") === String(playlistId)
    );
  }

  function getFilteredPlaylistTracks(playlist) {
    const tracks = playlist?.tracks || [];
    const query = String(playlistSearch?.value || "").trim().toLowerCase();
    if (!query) return tracks;
    return tracks.filter((track) => {
      const haystack = [track.title, track.artist, track.mood].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  async function renderPlaylistDetail(playlistId, { refresh = false } = {}) {
    const playlist = findMinePlaylistById(playlistId);
    if (!playlist || !minePlaylistDetail || !playlistTrackList) return;
    activeMinePlaylistId = playlist.id;
    resetArtistState();
    documentRef.body.dataset.mineView = "detail";
    if (minePlaylistList) minePlaylistList.hidden = true;
    minePlaylistDetail.hidden = false;
    if (mineArtistDetail) mineArtistDetail.hidden = true;
    if (musicSearchPage) musicSearchPage.hidden = true;
    if (artistTopbar) artistTopbar.hidden = true;
    if (artistProfilePanel) artistProfilePanel.hidden = true;
    if (userProfilePanel) userProfilePanel.hidden = false;
    if (playlistNameSearch) playlistNameSearch.disabled = true;
    if (!playlist.tracks?.length && playlist.cachedTrackCount) {
      playlistTrackList.innerHTML = "";
    } else if (!playlist.tracks?.length) {
      playlistTrackList.innerHTML = `<div class="mine-empty">正在读取本地歌单...</div>`;
    }
    const hydratedPlaylist = shouldLoadPlaylistDetail(playlist, { refresh })
      ? await loadPlaylistDetail(playlist, { refresh })
      : playlist;
    activeNeteasePlaylist = hydratedPlaylist.source === "netease" ? hydratedPlaylist : null;
    if (playlistHeroCover) playlistHeroCover.setAttribute("style", getPlaylistCover(hydratedPlaylist));
    if (playlistHeroTitle) playlistHeroTitle.textContent = hydratedPlaylist.title;
    if (playlistHeroDesc) playlistHeroDesc.textContent = getPlaylistDescription(hydratedPlaylist);
    const tracks = getFilteredPlaylistTracks(hydratedPlaylist);
    if (minePlaylistCount) minePlaylistCount.textContent = `${tracks.length}/${hydratedPlaylist.tracks.length} 首`;
    if (!tracks.length) {
      playlistTrackList.innerHTML = `<div class="mine-empty">歌单里没有匹配的歌曲</div>`;
      return;
    }
    playlistTrackList.innerHTML = tracks
      .map((track, index) => renderTrackRow(track, index, {
        queueIndex: findTrackIndex(track.id),
        allowRemove: hydratedPlaylist.source === "netease" && Boolean(hydratedPlaylist.sourceId),
        actionButtons: ["next", "collect", "remove"]
      }))
      .join("");
    hydrateLazyBackgrounds(playlistTrackList);
  }

  function setPlaylistSearchOpen(open) {
    if (!playlistSearchBox || !playlistSearchToggle) return;
    playlistSearchBox.classList.toggle("is-open", open);
    playlistSearchToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      playlistSearch?.focus();
    } else if (playlistSearch) {
      playlistSearch.value = "";
      if (activeMinePlaylistId) renderPlaylistDetail(activeMinePlaylistId);
    }
  }

  function clearActivePlaylist() {
    activeMinePlaylistId = "";
  }

  function setActiveNeteasePlaylist(playlist) {
    activeNeteasePlaylist = playlist || null;
  }

  return {
    clearActivePlaylist,
    findMinePlaylistById,
    getActiveMinePlaylistId: () => activeMinePlaylistId,
    getActiveNeteasePlaylist: () => activeNeteasePlaylist,
    getFilteredPlaylistTracks,
    renderPlaylistDetail,
    setActiveNeteasePlaylist,
    setPlaylistSearchOpen
  };
}
