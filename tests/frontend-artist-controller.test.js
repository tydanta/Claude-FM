import assert from "node:assert/strict";
import { createArtistController } from "../public/modules/netease/artistController.js";

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

function createElement(dataset = {}) {
  return {
    hidden: false,
    disabled: false,
    value: "",
    placeholder: "",
    textContent: "",
    innerHTML: "",
    dataset: { ...dataset },
    style: {},
    attrs: {},
    classList: createClassList(),
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    }
  };
}

function createHarness({ response, reject = false } = {}) {
  const calls = {
    api: [],
    pages: [],
    rows: [],
    covers: [],
    prewarm: [],
    searchInput: []
  };
  const elements = {
    musicSearch: createElement(),
    musicSearchPage: createElement(),
    musicSearchBackBtn: createElement(),
    userProfilePanel: createElement(),
    minePlaylistList: createElement(),
    minePlaylistDetail: createElement(),
    mineArtistDetail: createElement(),
    artistTopbar: createElement(),
    artistProfilePanel: createElement(),
    artistHeroAvatar: createElement(),
    artistHeroName: createElement(),
    artistHeroDesc: createElement(),
    artistTabs: [createElement({ artistTab: "songs" }), createElement({ artistTab: "albums" })],
    artistSongsPanel: createElement(),
    artistAlbumsPanel: createElement(),
    artistSongCount: createElement(),
    artistSongList: createElement(),
    artistSongPager: createElement(),
    artistAlbumCount: createElement(),
    artistAlbumList: createElement(),
    artistAlbumPager: createElement(),
    playlistNameSearch: createElement()
  };
  const controller = createArtistController({
    elements,
    documentRef: { body: { dataset: {} } },
    neteaseApi: {
      async getArtist(params) {
        calls.api.push(params);
        if (reject) throw new Error("offline");
        return response || {};
      }
    },
    getSearchQuery: () => elements.musicSearch.value,
    setSearchInputForArtist: (active) => {
      calls.searchInput.push(active);
      elements.musicSearch.value = "";
      elements.musicSearch.placeholder = active ? "search artist" : "search music";
    },
    setAppPage: (page) => calls.pages.push(page),
    renderTrackRow: (track, index) => {
      calls.rows.push({ track, index });
      return `<button data-row="${index}">${track.title}</button>`;
    },
    renderArtistAlbums: (albums) => albums.map((album) => `<article>${album.name}</article>`).join(""),
    renderArtistPagerHtml: (page, totalPages, type) => totalPages <= 1 ? "" : `<button data-artist-page="${type}" data-page-dir="1">${page}/${totalPages}</button>`,
    selectArtistHeroImage: (artist, songs) => artist.avatar || songs[0]?.cover || "",
    getArtistDescription: (artist, name, songCount) => `${artist.name || name}:${songCount}`,
    getNeteaseCoverProxyUrl: (cover, target) => {
      calls.covers.push({ cover, target });
      return `/cover/${target}/${cover}`;
    },
    prewarmVisibleCovers: (tracks, target) => calls.prewarm.push({ tracks, target })
  });
  return { calls, controller, elements };
}

{
  const response = {
    artist: { name: "Miles", avatar: "miles.jpg" },
    songs: Array.from({ length: 12 }, (_, index) => ({
      title: index === 11 ? "Blue Train" : `Song ${index}`,
      artist: "Miles",
      album: index === 11 ? "Blue Album" : "Other",
      cover: `song-${index}.jpg`
    })),
    albums: [
      { name: "Blue Album", company: "Prestige" },
      { name: "Red Album", company: "Blue Note" }
    ]
  };
  const { calls, controller, elements } = createHarness({ response });

  await controller.openArtistPage({ id: "42", name: "Miles" });

  assert.deepEqual(calls.api[0], { id: "42" });
  assert.equal(calls.pages.at(-1), "artist");
  assert.equal(elements.mineArtistDetail.hidden, false);
  assert.equal(elements.artistHeroName.textContent, "Miles");
  assert.equal(elements.artistHeroDesc.textContent, "Miles:12");
  assert.equal(elements.artistSongCount.textContent, "12 首");
  assert.equal(elements.artistAlbumCount.textContent, "2 张");
  assert.match(elements.artistSongList.innerHTML, /Song 0/);
  assert.match(elements.artistSongPager.innerHTML, /songs/);
  assert.equal(controller.getActiveArtistTracks().length, 12);
  assert.equal(calls.prewarm[0].target, "list");
}

{
  const response = {
    artist: { name: "Miles" },
    songs: [
      { title: "Kind of Blue", artist: "Miles", album: "Kind of Blue" },
      { title: "So What", artist: "Miles", album: "Kind of Blue" },
      { title: "Round Midnight", artist: "Miles", album: "Other" }
    ],
    albums: [
      { name: "Kind of Blue", company: "Columbia" },
      { name: "Milestones", company: "Columbia" }
    ]
  };
  const { controller, elements } = createHarness({ response });
  await controller.openArtistPage({ name: "Miles" });

  elements.musicSearch.value = "kind";
  controller.resetArtistPage();
  controller.renderArtistContent();

  assert.equal(elements.artistSongCount.textContent, "2 首");
  assert.equal(elements.artistAlbumCount.textContent, "1 张");
  assert.match(elements.artistSongList.innerHTML, /Kind of Blue/);
  assert.doesNotMatch(elements.artistSongList.innerHTML, /Round Midnight/);
  assert.match(elements.artistAlbumList.innerHTML, /Kind of Blue/);
}

{
  const response = {
    artist: { name: "Miles" },
    songs: [{ title: "Song" }],
    albums: Array.from({ length: 11 }, (_, index) => ({ name: `Album ${index}` }))
  };
  const { controller, elements } = createHarness({ response });
  await controller.openArtistPage({ name: "Miles" });

  controller.setActiveArtistTab("albums");
  controller.moveArtistPage("albums", 1);

  assert.equal(elements.artistSongsPanel.hidden, true);
  assert.equal(elements.artistAlbumsPanel.hidden, false);
  assert.equal(elements.artistTabs[0].attrs["aria-selected"], "false");
  assert.equal(elements.artistTabs[1].attrs["aria-selected"], "true");
  assert.match(elements.artistAlbumList.innerHTML, /Album 10/);
  assert.doesNotMatch(elements.artistAlbumList.innerHTML, /Album 9/);
}

{
  const { controller, elements } = createHarness({ reject: true });

  await assert.rejects(() => controller.openArtistPage({ id: "404", name: "Missing" }), /offline/);

  assert.equal(controller.getActiveArtistTracks().length, 0);
  assert.equal(elements.artistHeroDesc.textContent, "正在加载网易云歌手主页...");
  assert.match(elements.artistSongList.innerHTML, /正在加载歌手热门歌曲/);
}

{
  const calls = { api: [] };
  const elements = {
    musicSearch: createElement(),
    musicSearchPage: createElement(),
    minePlaylistList: createElement(),
    minePlaylistDetail: createElement(),
    mineArtistDetail: createElement(),
    artistHeroName: createElement(),
    artistHeroDesc: createElement(),
    artistTabs: [createElement({ artistTab: "songs" })],
    artistSongsPanel: createElement(),
    artistAlbumsPanel: createElement(),
    artistSongCount: createElement(),
    artistSongList: createElement(),
    artistSongPager: createElement(),
    artistAlbumCount: createElement(),
    artistAlbumList: createElement(),
    artistAlbumPager: createElement()
  };
  const controller = createArtistController({
    elements,
    documentRef: { body: { dataset: {} } },
    neteaseApi: {
      async getArtist(params) {
        calls.api.push(params);
        if (calls.api.length > 1) throw new Error("offline");
        return {
          artist: { name: "Miles" },
          songs: [{ title: "Blue in Green" }],
          albums: []
        };
      }
    },
    getSearchQuery: () => "",
    renderTrackRow: (track) => `<button>${track.title}</button>`,
    renderArtistAlbums: () => "",
    renderArtistPagerHtml: () => "",
    selectArtistHeroImage: () => "",
    getArtistDescription: (artist, name, songCount) => `${artist.name || name}:${songCount}`
  });

  await controller.openArtistPage({ id: "42", name: "Miles" });
  await assert.rejects(() => controller.openArtistPage({ id: "404", name: "Missing" }), /offline/);

  assert.equal(controller.getActiveArtistSource(), "42");
  assert.equal(controller.getActiveArtistTracks()[0].title, "Blue in Green");
}

console.log("frontend-artist-controller tests passed");
