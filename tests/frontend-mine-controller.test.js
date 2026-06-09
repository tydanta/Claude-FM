import assert from "node:assert/strict";
import { createMineController } from "../public/modules/netease/mineController.js";

function createClassList() {
  return {
    values: new Set(),
    add(name) {
      this.values.add(name);
    },
    remove(name) {
      this.values.delete(name);
    },
    contains(name) {
      return this.values.has(name);
    },
    toggle(name, force) {
      const enabled = Boolean(force);
      if (enabled) this.add(name);
      else this.remove(name);
      return enabled;
    }
  };
}

function createElement() {
  return {
    hidden: false,
    disabled: false,
    value: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    style: {},
    classList: createClassList()
  };
}

function createHarness({ queue = [], loginStatusResponse, playlistsResponse } = {}) {
  const calls = {
    getPlaylists: [],
    renderCards: [],
    renderDetail: [],
    resetArtist: 0,
    prewarm: [],
    prewarmDetails: [],
    play: 0
  };
  const elements = {
    neteaseLoginBtn: createElement(),
    neteaseLoginStatus: createElement(),
    neteaseProfileName: createElement(),
    neteaseAvatar: createElement(),
    neteaseStickyName: createElement(),
    neteaseStickyAvatar: createElement(),
    musicSearch: createElement(),
    musicSearchBackBtn: createElement(),
    userProfilePanel: createElement(),
    minePlaylistList: createElement(),
    minePlaylistCount: createElement(),
    playlistNameSearch: createElement(),
    musicSearchPage: createElement(),
    minePlaylistDetail: createElement(),
    artistTopbar: createElement(),
    artistProfilePanel: createElement(),
    mineArtistDetail: createElement()
  };
  const controller = createMineController({
    elements,
    documentRef: { body: { dataset: {} } },
    neteaseApi: {
      async getLoginStatus() {
        return loginStatusResponse || {};
      },
      async getPlaylists(options) {
        calls.getPlaylists.push(options);
        return playlistsResponse || {};
      }
    },
    getQueue: () => queue,
    getActiveMinePlaylistId: () => "",
    renderPlaylistDetail: async (playlistId) => calls.renderDetail.push(playlistId),
    resetArtistState: () => calls.resetArtist += 1,
    renderPlaylistCards: (playlists) => {
      calls.renderCards.push(playlists);
      return playlists.map((playlist) => `<button data-playlist-id="${playlist.id}">${playlist.title}</button>`).join("");
    },
    getCoverUrl: (cover, target) => `/cover/${target}/${cover}`,
    prewarmVisibleCovers: (tracks, target) => calls.prewarm.push({ tracks, target }),
    prewarmPlaylistDetails: (playlists) => calls.prewarmDetails.push(playlists),
    onRenderedPlaylistCard: () => calls.play += 1
  });
  return { calls, controller, elements };
}

{
  const { controller, elements } = createHarness();

  controller.setNeteaseProfile({ userId: 42, nickname: "Danta", avatarUrl: "avatar.jpg" });

  assert.equal(elements.neteaseProfileName.textContent, "Danta");
  assert.equal(elements.neteaseStickyName.textContent, "Danta");
  assert.equal(elements.neteaseLoginStatus.textContent, "网易云已登录，歌单会同步到本地 SQLite。");
  assert.equal(elements.neteaseLoginBtn.textContent, "同步网易云歌单");
  assert.equal(elements.neteaseLoginBtn.dataset.neteaseLoggedIn, "true");
  assert.match(elements.neteaseAvatar.style.backgroundImage, /\/cover\/grid\/avatar\.jpg/);
  assert.equal(elements.neteaseAvatar.classList.contains("has-image"), true);
  assert.equal(elements.neteaseStickyAvatar.classList.contains("has-image"), true);
}

{
  const playlists = [{ id: "n1", source: "netease", sourceId: "pl-1", title: "离线歌单", trackCount: 5, tracks: [] }];
  const { calls, controller, elements } = createHarness({
    playlistsResponse: {
      source: "local-cache",
      offline: true,
      profile: { userId: 1, nickname: "Cache" },
      playlists
    }
  });

  const data = await controller.loadNeteasePlaylists({ refresh: false, render: false });

  assert.equal(data.playlists, playlists);
  assert.deepEqual(calls.getPlaylists[0], { refresh: false });
  assert.equal(controller.getNeteasePlaylists().length, 1);
  assert.equal(elements.neteaseLoginBtn.dataset.neteaseLoggedIn, "false");
  assert.equal(elements.neteaseLoginBtn.textContent, "登录网易云");
  assert.equal(elements.neteaseLoginStatus.textContent, "网易云登录已失效，已离线读取 1 个本地歌单。");
}

{
  const { controller, elements } = createHarness({
    playlistsResponse: {
      loggedIn: false,
      playlists: []
    }
  });

  await controller.loadNeteasePlaylists();

  assert.equal(elements.neteaseLoginStatus.textContent, "请先登录网易云。");
  assert.equal(elements.minePlaylistCount.textContent, "0/0 个");
  assert.match(elements.minePlaylistList.innerHTML, /没有找到匹配的歌单/);
}

{
  const queue = [{ id: "city-focus", title: "Local Track" }];
  const { calls, controller, elements } = createHarness({ queue });
  controller.setNeteasePlaylists([
    { id: "n1", source: "netease", sourceId: "pl-1", title: "Afro House", trackCount: 3, tracks: [] },
    { id: "n2", source: "netease", sourceId: "pl-2", title: "Midtempo", trackCount: 2, tracks: [] }
  ]);

  elements.playlistNameSearch.value = "afro";
  controller.renderMinePlaylist();

  assert.equal(elements.musicSearch.placeholder, "搜索音乐");
  assert.equal(elements.minePlaylistCount.textContent, "1/4 个");
  assert.equal(calls.renderCards[0].length, 1);
  assert.equal(calls.renderCards[0][0].title, "Afro House");
  assert.match(elements.minePlaylistList.innerHTML, /Afro House/);
  assert.doesNotMatch(elements.minePlaylistList.innerHTML, /Midtempo/);
  assert.equal(calls.play, 0);
}

{
  const { calls, controller } = createHarness({
    loginStatusResponse: {
      offline: true,
      loggedIn: false,
      hasLocalData: true,
      profile: null
    },
    playlistsResponse: {
      source: "local-cache",
      offline: true,
      playlists: [{ id: "cached", source: "netease", sourceId: "pl", title: "Cached", trackCount: 1, tracks: [] }]
    }
  });

  await controller.refreshNeteaseStatus();

  assert.equal(calls.getPlaylists.length, 1);
}

{
  const { calls, controller, elements } = createHarness({
    loginStatusResponse: {
      offline: true,
      loggedIn: false,
      cookieReady: true,
      hasLocalData: true,
      profile: { userId: 9, nickname: "Cached" }
    },
    playlistsResponse: {
      source: "local-cache",
      loggedIn: true,
      cookieReady: true,
      profile: { userId: 9, nickname: "Cached" },
      playlists: [{ id: "cached", source: "netease", sourceId: "pl", title: "Cached", trackCount: 1, tracks: [] }]
    }
  });

  await controller.refreshNeteaseStatus();

  assert.equal(calls.getPlaylists.length, 1);
  assert.equal(elements.neteaseLoginBtn.dataset.neteaseLoggedIn, "true");
  assert.notEqual(elements.neteaseLoginStatus.textContent, "网易云登录已失效，正在使用本地已保存歌单。");
}

{
  const { controller, elements } = createHarness({
    playlistsResponse: {
      source: "netease",
      loggedIn: false,
      cookieReady: true,
      profile: { userId: 9, nickname: "Cached" },
      playlists: [{ id: "synced", source: "netease", sourceId: "pl", title: "Synced", trackCount: 1, tracks: [] }]
    }
  });

  await controller.loadNeteasePlaylists({ refresh: true, render: false });

  assert.equal(elements.neteaseLoginBtn.dataset.neteaseLoggedIn, "true");
}

{
  const playlistWithTracks = { id: "loaded", source: "netease", sourceId: "loaded-source", title: "Loaded", tracks: [{ id: "t1" }] };
  const playlistMissingTracks = { id: "cold", source: "netease", sourceId: "cold-source", title: "Cold", trackCount: 20, tracks: [] };
  const { calls, controller } = createHarness({
    playlistsResponse: {
      source: "local-cache",
      loggedIn: true,
      playlists: [playlistWithTracks, playlistMissingTracks, { id: "local", source: "local", title: "Local", tracks: [] }]
    }
  });

  await controller.loadNeteasePlaylists({ render: false });

  assert.equal(calls.prewarmDetails.length, 1);
  assert.deepEqual(calls.prewarmDetails[0].map((playlist) => playlist.id), ["cold"]);
}

console.log("frontend-mine-controller tests passed");
