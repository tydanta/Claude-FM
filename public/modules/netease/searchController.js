import { hydrateLazyBackgrounds } from "../ui/lazyBackgrounds.js";

export function createSearchController({
  musicSearch,
  musicSearchResults,
  musicSearchPageBtn,
  musicSearchPage,
  musicSearchBackBtn,
  musicSearchPageTitle,
  musicSearchPageCount,
  musicSearchPageList,
  userProfilePanel,
  artistTopbar,
  artistProfilePanel,
  minePlaylistList,
  minePlaylistDetail,
  mineArtistDetail,
  playlistNameSearch,
  neteaseApi,
  isMineSearchOpen = () => musicSearch?.classList.contains("is-open"),
  renderMinePlaylist = () => {},
  setMineSearchOpen = () => {},
  renderTrackRow = () => "",
  renderSearchPreviewItems = () => "",
  getSearchPageTitle = (query) => query,
  getSearchPageCount = (count) => `${count}`,
  preloadNeteaseCoverSlice = () => {},
  prewarmVisibleCovers = () => {},
  documentRef = document
} = {}) {
  let songs = [];
  let query = "";
  let hasMore = false;
  let loadingMore = false;

  function renderMusicSearchResults(nextSongs = []) {
    if (!musicSearchResults) return;
    if (!nextSongs.length) {
      musicSearchResults.hidden = true;
      musicSearchResults.innerHTML = "";
      return;
    }
    musicSearchResults.hidden = false;
    musicSearchResults.innerHTML = renderSearchPreviewItems(nextSongs);
    hydrateLazyBackgrounds(musicSearchResults);
    preloadNeteaseCoverSlice(nextSongs, { target: "list", limit: 20, priority: "high" });
  }

  function renderMusicSearchPage() {
    if (!musicSearchPage || !musicSearchPageList) return;
    const pageQuery = query || (musicSearch?.value || "").trim();
    documentRef.body.dataset.mineView = "search";
    if (!isMineSearchOpen()) setMineSearchOpen(true);
    if (musicSearchBackBtn) musicSearchBackBtn.hidden = false;
    if (userProfilePanel) userProfilePanel.hidden = true;
    if (artistTopbar) artistTopbar.hidden = true;
    if (artistProfilePanel) artistProfilePanel.hidden = true;
    if (minePlaylistList) minePlaylistList.hidden = true;
    if (minePlaylistDetail) minePlaylistDetail.hidden = true;
    if (mineArtistDetail) mineArtistDetail.hidden = true;
    if (musicSearchResults) musicSearchResults.hidden = true;
    musicSearchPage.hidden = false;
    if (playlistNameSearch) playlistNameSearch.disabled = true;
    if (musicSearchPageTitle) musicSearchPageTitle.textContent = getSearchPageTitle(pageQuery);
    if (musicSearchPageCount) musicSearchPageCount.textContent = getSearchPageCount(songs.length, hasMore);
    musicSearchPageList.innerHTML = songs.length
      ? songs.map((track, index) => renderTrackRow(track, index, { queueIndex: -1, actionLabel: "\u64ad\u653e", actionButtons: ["next", "collect"], showCover: false, lazyCover: false })).join("")
      : `<div class="mine-empty">\u6ca1\u6709\u641c\u7d22\u5230\u6b4c\u66f2</div>`;
  }

  async function searchNeteaseMusic({ limit = 12, openPage = false, append = false } = {}) {
    const nextQuery = (musicSearch?.value || "").trim();
    if (!nextQuery) {
      renderMusicSearchResults([]);
      songs = [];
      query = "";
      hasMore = false;
      renderMinePlaylist();
      return;
    }
    const offset = append && query === nextQuery ? songs.length : 0;
    query = nextQuery;
    const data = await neteaseApi.searchSongs({ keywords: nextQuery, limit, offset });
    const nextSongs = data.songs || [];
    songs = append ? [...songs, ...nextSongs] : nextSongs;
    hasMore = Boolean(data.hasMore) && nextSongs.length > 0;
    renderMusicSearchResults(songs.slice(0, 6));
    if (openPage) renderMusicSearchPage();
    if (musicSearchPageBtn) musicSearchPageBtn.disabled = false;
  }

  async function openMusicSearchPageFromInput() {
    const nextQuery = (musicSearch?.value || "").trim();
    if (!nextQuery) {
      songs = [];
      query = "";
      hasMore = false;
      renderMusicSearchResults([]);
      if (musicSearchPage) musicSearchPage.hidden = true;
      if (musicSearchBackBtn) musicSearchBackBtn.hidden = true;
      if (playlistNameSearch) playlistNameSearch.disabled = false;
      setMineSearchOpen(false);
      renderMinePlaylist();
      return;
    }
    if (!isMineSearchOpen()) {
      setMineSearchOpen(true);
    }
    if (query !== nextQuery || songs.length < 20) {
      await searchNeteaseMusic({ limit: 20, openPage: true }).catch(() => {
        songs = [];
        hasMore = false;
        renderMusicSearchPage();
      });
      return;
    }
    renderMusicSearchPage();
  }

  async function loadMoreMusicSearchResults() {
    if (loadingMore || !hasMore || musicSearchPage?.hidden !== false) return;
    loadingMore = true;
    try {
      await searchNeteaseMusic({ limit: 10, openPage: true, append: true });
    } finally {
      loadingMore = false;
    }
  }

  function maybeLoadMoreMusicSearchResults(scroller) {
    if (musicSearchPage?.hidden !== false) return;
    const target = scroller || musicSearchPage;
    if (!target) return;
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 120) {
      loadMoreMusicSearchResults().catch(() => {});
    }
  }

  return {
    getHasMore: () => hasMore,
    getQuery: () => query,
    getSongs: () => songs,
    loadMoreMusicSearchResults,
    maybeLoadMoreMusicSearchResults,
    openMusicSearchPageFromInput,
    renderMusicSearchPage,
    renderMusicSearchResults,
    searchNeteaseMusic
  };
}
