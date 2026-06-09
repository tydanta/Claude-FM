import { hydrateLazyBackgrounds } from "../ui/lazyBackgrounds.js";

function paginateItems(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    page: safePage,
    totalPages,
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize)
  };
}

function normalizeArtistElements(elements = {}) {
  return {
    musicSearch: elements.musicSearch,
    musicSearchPage: elements.musicSearchPage,
    musicSearchBackBtn: elements.musicSearchBackBtn,
    userProfilePanel: elements.userProfilePanel,
    minePlaylistList: elements.minePlaylistList,
    minePlaylistDetail: elements.minePlaylistDetail,
    mineArtistDetail: elements.mineArtistDetail,
    artistTopbar: elements.artistTopbar,
    artistProfilePanel: elements.artistProfilePanel,
    artistHeroAvatar: elements.artistHeroAvatar,
    artistHeroName: elements.artistHeroName,
    artistHeroDesc: elements.artistHeroDesc,
    artistTabs: elements.artistTabs || [],
    artistSongsPanel: elements.artistSongsPanel,
    artistAlbumsPanel: elements.artistAlbumsPanel,
    artistSongCount: elements.artistSongCount,
    artistSongList: elements.artistSongList,
    artistSongPager: elements.artistSongPager,
    artistAlbumCount: elements.artistAlbumCount,
    artistAlbumList: elements.artistAlbumList,
    artistAlbumPager: elements.artistAlbumPager,
    playlistNameSearch: elements.playlistNameSearch
  };
}

export function createArtistController({
  elements = {},
  neteaseApi,
  getSearchQuery = () => "",
  setSearchInputForArtist = () => {},
  setAppPage = () => {},
  renderTrackRow = () => "",
  renderArtistAlbums = () => "",
  renderArtistPagerHtml = () => "",
  selectArtistHeroImage = () => "",
  getArtistDescription = () => "",
  getNeteaseCoverProxyUrl = (cover) => cover,
  prewarmVisibleCovers = () => {},
  onOpenArtistPage = () => {},
  documentRef = document
} = {}) {
  const {
    musicSearchPage,
    musicSearchBackBtn,
    userProfilePanel,
    minePlaylistList,
    minePlaylistDetail,
    mineArtistDetail,
    artistTopbar,
    artistProfilePanel,
    artistHeroAvatar,
    artistHeroName,
    artistHeroDesc,
    artistTabs,
    artistSongsPanel,
    artistAlbumsPanel,
    artistSongCount,
    artistSongList,
    artistSongPager,
    artistAlbumCount,
    artistAlbumList,
    artistAlbumPager,
    playlistNameSearch
  } = normalizeArtistElements(elements);

  let activeArtistSource = "";
  let activeArtistTracks = [];
  let activeArtistAlbums = [];
  let activeArtistTab = "songs";
  let artistSongPage = 1;
  let artistAlbumPage = 1;
  let artistRequestId = 0;

  function getFilteredArtistSongs() {
    const query = String(getSearchQuery() || "").trim().toLowerCase();
    if (!query) return activeArtistTracks;
    return activeArtistTracks.filter((track) => {
      const haystack = [track.title, track.artist, track.album].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function getFilteredArtistAlbums() {
    const query = String(getSearchQuery() || "").trim().toLowerCase();
    if (!query) return activeArtistAlbums;
    return activeArtistAlbums.filter((album) => {
      const haystack = [album.name, album.artist?.name, album.company, album.subType].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function renderArtistPager(container, page, totalPages, type) {
    if (!container) return;
    container.innerHTML = renderArtistPagerHtml(page, totalPages, type);
  }

  function renderArtistContent() {
    if (!mineArtistDetail || mineArtistDetail.hidden) return;
    const songs = getFilteredArtistSongs();
    const albums = getFilteredArtistAlbums();
    if (artistSongCount) artistSongCount.textContent = `${songs.length} 首`;
    if (artistAlbumCount) artistAlbumCount.textContent = `${albums.length} 张`;
    artistTabs.forEach((tab) => {
      const active = tab.dataset.artistTab === activeArtistTab;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    if (artistSongsPanel) artistSongsPanel.hidden = activeArtistTab !== "songs";
    if (artistAlbumsPanel) artistAlbumsPanel.hidden = activeArtistTab !== "albums";

    const songPageData = paginateItems(songs, artistSongPage, 10);
    artistSongPage = songPageData.page;
    if (artistSongList) {
      artistSongList.innerHTML = songPageData.items.length
        ? songPageData.items.map((track, index) => renderTrackRow(track, (songPageData.page - 1) * 10 + index, { queueIndex: -1, actionLabel: "播放", actionButtons: ["next", "collect"] })).join("")
        : `<div class="mine-empty">没有匹配的歌曲</div>`;
    }
    if (artistSongList) hydrateLazyBackgrounds(artistSongList);
    renderArtistPager(artistSongPager, songPageData.page, songPageData.totalPages, "songs");

    const albumPageData = paginateItems(albums, artistAlbumPage, 10);
    artistAlbumPage = albumPageData.page;
    if (artistAlbumList) {
      artistAlbumList.innerHTML = renderArtistAlbums(albumPageData.items, getNeteaseCoverProxyUrl);
    }
    renderArtistPager(artistAlbumPager, albumPageData.page, albumPageData.totalPages, "albums");
    prewarmVisibleCovers(songPageData.items, "list");
  }

  function resetArtistPage() {
    artistSongPage = 1;
    artistAlbumPage = 1;
  }

  function resetArtistState() {
    activeArtistSource = "";
    activeArtistTracks = [];
    activeArtistAlbums = [];
    activeArtistTab = "songs";
    resetArtistPage();
  }

  function setActiveArtistTab(tab) {
    activeArtistTab = tab === "albums" ? "albums" : "songs";
    renderArtistContent();
  }

  function moveArtistPage(type, dir) {
    const delta = Number(dir || 0);
    if (type === "albums") {
      artistAlbumPage += delta;
    } else {
      artistSongPage += delta;
    }
    renderArtistContent();
  }

  async function openArtistPage({ id = "", name = "" } = {}) {
    const artistId = String(id || "").trim();
    const artistName = String(name || "").trim();
    if (!artistId && !artistName) return;
    const requestSource = artistId || artistName;
    const requestId = artistRequestId + 1;
    artistRequestId = requestId;
    onOpenArtistPage();
    setSearchInputForArtist(true);
    documentRef.body.dataset.mineView = "list";
    if (musicSearchBackBtn) musicSearchBackBtn.hidden = true;
    if (minePlaylistList) minePlaylistList.hidden = true;
    if (minePlaylistDetail) minePlaylistDetail.hidden = true;
    if (mineArtistDetail) mineArtistDetail.hidden = false;
    if (musicSearchPage) musicSearchPage.hidden = true;
    if (userProfilePanel) userProfilePanel.hidden = true;
    if (artistTopbar) artistTopbar.hidden = false;
    if (artistProfilePanel) artistProfilePanel.hidden = false;
    if (playlistNameSearch) playlistNameSearch.disabled = true;
    if (artistHeroName) artistHeroName.textContent = artistName || "歌手主页";
    if (artistHeroDesc) artistHeroDesc.textContent = "正在加载网易云歌手主页...";
    if (artistSongList) artistSongList.innerHTML = `<div class="mine-empty">正在加载歌手热门歌曲...</div>`;
    if (artistAlbumList) artistAlbumList.innerHTML = "";
    if (artistSongPager) artistSongPager.innerHTML = "";
    if (artistAlbumPager) artistAlbumPager.innerHTML = "";
    setAppPage("artist");

    const data = await neteaseApi.getArtist(artistId ? { id: artistId } : { name: artistName });
    if (artistRequestId !== requestId) return;
    const artist = data.artist || {};
    const songs = data.songs || [];
    const albums = data.albums || [];
    activeArtistSource = requestSource;
    activeArtistTab = "songs";
    resetArtistPage();
    activeArtistTracks = songs;
    activeArtistAlbums = albums;
    const artistImage = selectArtistHeroImage(artist, songs);
    if (artistHeroAvatar) {
      artistHeroAvatar.style.backgroundImage = artistImage ? `url("${getNeteaseCoverProxyUrl(artistImage, "detail")}")` : "";
      artistHeroAvatar.classList.toggle("has-image", Boolean(artistImage));
    }
    if (artistHeroName) artistHeroName.textContent = artist.name || artistName || "歌手主页";
    if (artistHeroDesc) artistHeroDesc.textContent = getArtistDescription(artist, artistName, songs.length);
    renderArtistContent();
  }

  return {
    getArtistTrackGroups: () => [activeArtistTracks],
    getActiveArtistAlbums: () => activeArtistAlbums,
    getActiveArtistSource: () => activeArtistSource,
    getActiveArtistTracks: () => activeArtistTracks,
    getFilteredArtistAlbums,
    getFilteredArtistSongs,
    moveArtistPage,
    openArtistPage,
    renderArtistContent,
    resetArtistPage,
    resetArtistState,
    setActiveArtistTab
  };
}
