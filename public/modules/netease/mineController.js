function normalizeMineElements(elements = {}) {
  return {
    neteaseLoginBtn: elements.neteaseLoginBtn,
    neteaseLoginStatus: elements.neteaseLoginStatus,
    neteaseProfileName: elements.neteaseProfileName,
    neteaseAvatar: elements.neteaseAvatar,
    neteaseStickyName: elements.neteaseStickyName,
    neteaseStickyAvatar: elements.neteaseStickyAvatar,
    musicSearch: elements.musicSearch,
    musicSearchBackBtn: elements.musicSearchBackBtn,
    userProfilePanel: elements.userProfilePanel,
    minePlaylistList: elements.minePlaylistList,
    minePlaylistCount: elements.minePlaylistCount,
    playlistNameSearch: elements.playlistNameSearch,
    musicSearchPage: elements.musicSearchPage,
    minePlaylistDetail: elements.minePlaylistDetail,
    artistTopbar: elements.artistTopbar,
    artistProfilePanel: elements.artistProfilePanel,
    mineArtistDetail: elements.mineArtistDetail
  };
}

export function createMineController({
  elements = {},
  documentRef = document,
  neteaseApi,
  getQueue = () => [],
  getActiveMinePlaylistId = () => "",
  getActiveNeteasePlaylist = () => null,
  setActiveNeteasePlaylist = () => {},
  renderPlaylistDetail = async () => {},
  resetArtistState = () => {},
  renderPlaylistCards = () => "",
  getCoverUrl = (cover) => cover,
  prewarmVisibleCovers = () => {},
  prewarmPlaylistDetails = () => {}
} = {}) {
  const {
    neteaseLoginBtn,
    neteaseLoginStatus,
    neteaseProfileName,
    neteaseAvatar,
    neteaseStickyName,
    neteaseStickyAvatar,
    musicSearch,
    musicSearchBackBtn,
    userProfilePanel,
    minePlaylistList,
    minePlaylistCount,
    playlistNameSearch,
    musicSearchPage,
    minePlaylistDetail,
    artistTopbar,
    artistProfilePanel,
    mineArtistDetail
  } = normalizeMineElements(elements);

  let neteasePlaylists = [];

  function setNeteasePlaylists(playlists = []) {
    neteasePlaylists = Array.isArray(playlists) ? playlists : [];
  }

  function setNeteaseLoginButtonState(loggedIn) {
    if (!neteaseLoginBtn) return;
    neteaseLoginBtn.textContent = loggedIn ? "同步网易云歌单" : "登录网易云";
    if (!neteaseLoginBtn.dataset) neteaseLoginBtn.dataset = {};
    neteaseLoginBtn.dataset.neteaseLoggedIn = String(Boolean(loggedIn));
  }

  function getNeteasePlaylists() {
    return neteasePlaylists;
  }

  function getMinePlaylists() {
    const queue = getQueue();
    const byIds = (ids) => ids.map((id) => queue.find((track) => track.id === id)).filter(Boolean);
    const visibleNeteasePlaylists = neteasePlaylists.filter((playlist) => {
      const title = String(playlist.title || "");
      const isPrimaryLikedPlaylist = playlist.source === "netease" && Number(playlist.displayOrder || 0) < 0;
      return isPrimaryLikedPlaylist || !/^我喜欢的音乐$/.test(title);
    });
    const playlists = [
      ...visibleNeteasePlaylists,
      {
        id: "private-radio",
        title: "Claude FM 私人电台",
        subtitle: "今天正在播放",
        description: "按照当前时间、天气和你的偏好临时拼出的一组歌，适合直接开始听。",
        tracks: queue
      },
      {
        id: "focus-room",
        title: "专注房间",
        subtitle: "工作与编程",
        description: "节拍更稳、存在感更低，适合写代码、整理任务和进入长时间专注。",
        tracks: byIds(["city-focus", "omah-lay-understand", "lofi-morning"])
      },
      {
        id: "night-rain",
        title: "雨夜低速",
        subtitle: "夜读与收束",
        description: "把声音放低一点，让一天慢慢落地，适合阅读、复盘和准备休息。",
        tracks: byIds(["chisway-kolo", "chisway-overflow", "lofi-morning"])
      }
    ];
    return playlists.filter((playlist) => playlist.tracks?.length || playlist.trackCount);
  }

  function getFilteredMinePlaylists() {
    const query = (playlistNameSearch?.value || "").trim().toLowerCase();
    const playlists = getMinePlaylists();
    if (!query) return playlists;
    return playlists
      .map((playlist) => ({
        ...playlist,
        tracks: playlist.tracks || []
      }))
      .filter((playlist) => {
        const playlistHaystack = [playlist.title, playlist.subtitle, playlist.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return playlistHaystack.includes(query);
      });
  }

  function renderMinePlaylist() {
    if (!minePlaylistList || !minePlaylistCount) return;
    if (musicSearch) musicSearch.placeholder = "搜索音乐";
    const activeMinePlaylistId = getActiveMinePlaylistId();
    if (activeMinePlaylistId) {
      renderPlaylistDetail(activeMinePlaylistId);
      return;
    }
    resetArtistState();
    documentRef.body.dataset.mineView = "list";
    if (musicSearchBackBtn) musicSearchBackBtn.hidden = true;
    const playlists = getFilteredMinePlaylists();
    const total = getMinePlaylists().length;
    minePlaylistList.hidden = false;
    if (minePlaylistDetail) minePlaylistDetail.hidden = true;
    if (mineArtistDetail) mineArtistDetail.hidden = true;
    if (musicSearchPage) musicSearchPage.hidden = true;
    if (artistTopbar) artistTopbar.hidden = true;
    if (artistProfilePanel) artistProfilePanel.hidden = true;
    if (userProfilePanel) userProfilePanel.hidden = false;
    if (playlistNameSearch) playlistNameSearch.disabled = false;
    minePlaylistCount.textContent = `${playlists.length}/${total} 个`;
    if (!playlists.length) {
      minePlaylistList.innerHTML = `<div class="mine-empty">没有找到匹配的歌单</div>`;
      return;
    }
    minePlaylistList.innerHTML = renderPlaylistCards(playlists, getCoverUrl, { lazyCovers: true });
    hydrateLazyBackgrounds(minePlaylistList);
    prewarmVisibleCovers(playlists.flatMap((playlist) => playlist.tracks || []), "list");
  }

  function getPlaylistDetailPrewarmCandidates(playlists = []) {
    return playlists.filter((playlist) =>
      playlist?.source === "netease" &&
      playlist.sourceId &&
      (!Array.isArray(playlist.tracks) || playlist.tracks.length === 0) &&
      (playlist.trackCount || playlist.cachedTrackCount)
    );
  }

  function setNeteaseProfile(profile = null) {
    const loggedIn = Boolean(profile?.userId);
    const profileName = loggedIn ? (profile.nickname || "网易云用户") : "我的";
    if (neteaseProfileName) neteaseProfileName.textContent = profileName;
    if (neteaseStickyName) neteaseStickyName.textContent = profileName;
    if (neteaseLoginStatus) neteaseLoginStatus.textContent = loggedIn ? "网易云已登录，歌单会同步到本地 SQLite。" : "登录后同步你的歌单和喜欢音乐。";
    setNeteaseLoginButtonState(loggedIn);
    if (neteaseAvatar) {
      neteaseAvatar.style.backgroundImage = profile?.avatarUrl ? `url("${getCoverUrl(profile.avatarUrl, "grid")}")` : "";
      neteaseAvatar.classList.toggle("has-image", Boolean(profile?.avatarUrl));
    }
    if (neteaseStickyAvatar) {
      neteaseStickyAvatar.style.backgroundImage = profile?.avatarUrl ? `url("${getCoverUrl(profile.avatarUrl, "grid")}")` : "";
      neteaseStickyAvatar.classList.toggle("has-image", Boolean(profile?.avatarUrl));
    }
  }

  function replaceNeteasePlaylist(playlistId, nextPlaylist) {
    neteasePlaylists = neteasePlaylists.map((item) => item.id === playlistId ? nextPlaylist : item);
    return nextPlaylist;
  }

  function applyNeteaseDbSnapshot(data = {}) {
    if (Array.isArray(data.playlists)) {
      neteasePlaylists = data.playlists;
    }
    if (data.playlist?.id) {
      neteasePlaylists = neteasePlaylists.map((item) => item.id === data.playlist.id ? data.playlist : item);
      if (!neteasePlaylists.some((item) => item.id === data.playlist.id)) {
        neteasePlaylists = [data.playlist, ...neteasePlaylists];
      }
      if (getActiveNeteasePlaylist()?.id === data.playlist.id) {
        setActiveNeteasePlaylist(data.playlist);
      }
    }
    if (data.likedPlaylist?.id) {
      neteasePlaylists = neteasePlaylists.map((item) => item.id === data.likedPlaylist.id ? data.likedPlaylist : item);
      if (!neteasePlaylists.some((item) => item.id === data.likedPlaylist.id)) {
        neteasePlaylists = [data.likedPlaylist, ...neteasePlaylists];
      }
      if (getActiveNeteasePlaylist()?.id === data.likedPlaylist.id) {
        setActiveNeteasePlaylist(data.likedPlaylist);
      }
    }
  }

  async function loadNeteasePlaylists({ refresh = false, render = true, renderActiveDetail = true } = {}) {
    if (neteaseLoginStatus) neteaseLoginStatus.textContent = refresh ? "正在同步网易云歌单..." : "正在读取本地歌单...";
    const data = await neteaseApi.getPlaylists({ refresh });
    setNeteaseProfile(data.profile);
    setNeteasePlaylists(data.playlists || []);
    if ((data.offline && !data.cookieReady) || (data.loggedIn === false && !data.cookieReady)) setNeteaseLoginButtonState(false);
    if (neteaseLoginStatus) {
      if (data.source === "local-cache" && neteasePlaylists.length) {
        neteaseLoginStatus.textContent = data.offline
          ? `网易云登录已失效，已离线读取 ${neteasePlaylists.length} 个本地歌单。`
          : `已从本地读取 ${neteasePlaylists.length} 个网易云歌单。`;
      } else {
        neteaseLoginStatus.textContent = data.loggedIn
          ? `已同步 ${neteasePlaylists.length} 个网易云歌单。`
          : "请先登录网易云。";
      }
    }
    if (render) renderMinePlaylist();
    prewarmPlaylistDetails(getPlaylistDetailPrewarmCandidates(neteasePlaylists));
    const activeMinePlaylistId = getActiveMinePlaylistId();
    if (renderActiveDetail && activeMinePlaylistId) {
      renderPlaylistDetail(activeMinePlaylistId);
    }
    return data;
  }

  async function refreshNeteaseStatus() {
    try {
      const data = await neteaseApi.getLoginStatus();
      setNeteaseProfile(data.profile);
      if (data.loggedIn || data.hasLocalData) {
        await loadNeteasePlaylists();
        if (data.offline && !data.cookieReady && neteaseLoginStatus) {
          neteaseLoginStatus.textContent = "网易云登录已失效，正在使用本地已保存歌单。";
        }
      }
      return data;
    } catch {
      setNeteaseProfile(null);
      return null;
    }
  }

  return {
    applyNeteaseDbSnapshot,
    getFilteredMinePlaylists,
    getMinePlaylists,
    getNeteasePlaylists,
    loadNeteasePlaylists,
    refreshNeteaseStatus,
    renderMinePlaylist,
    replaceNeteasePlaylist,
    setNeteasePlaylists,
    setNeteaseProfile
  };
}
import { hydrateLazyBackgrounds } from "../ui/lazyBackgrounds.js";
