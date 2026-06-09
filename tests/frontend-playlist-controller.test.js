import assert from "node:assert/strict";
import { createPlaylistController } from "../public/modules/netease/playlistController.js";

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
      const enabled = force == null ? !this.contains(name) : Boolean(force);
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
    attrs: {},
    classList: createClassList(),
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    },
    focus() {
      this.focused = true;
    }
  };
}

function createHarness({ playlists = [], loadResponse } = {}) {
  const calls = {
    load: [],
    rows: [],
    resetArtist: 0
  };
  const elements = {
    minePlaylistList: createElement(),
    minePlaylistDetail: createElement(),
    mineArtistDetail: createElement(),
    musicSearchPage: createElement(),
    artistTopbar: createElement(),
    artistProfilePanel: createElement(),
    userProfilePanel: createElement(),
    playlistNameSearch: createElement(),
    playlistHeroCover: createElement(),
    playlistHeroTitle: createElement(),
    playlistHeroDesc: createElement(),
    playlistTrackList: createElement(),
    playlistSearchBox: createElement(),
    playlistSearchToggle: createElement(),
    playlistSearch: createElement(),
    minePlaylistCount: createElement()
  };
  const controller = createPlaylistController({
    elements,
    documentRef: { body: { dataset: {} } },
    getMinePlaylists: () => playlists,
    loadPlaylistDetail: async (playlist, options) => {
      calls.load.push({ playlist, options });
      return loadResponse || playlist;
    },
    resetArtistState: () => calls.resetArtist += 1,
    getPlaylistCover: (playlist) => `cover:${playlist.cover || playlist.title}`,
    getPlaylistDescription: (playlist) => playlist.description || `${playlist.tracks?.length || 0} tracks`,
    renderTrackRow: (track, index, options) => {
      calls.rows.push({ track, index, options });
      return `<button data-row="${index}">${track.title}</button>`;
    },
    findTrackIndex: (id) => playlists.flatMap((playlist) => playlist.tracks || []).findIndex((track) => track.id === id)
  });
  return { calls, controller, elements };
}

{
  const tracks = [
    { id: "t1", title: "Alpha", artist: "A" },
    { id: "t2", title: "Beta", artist: "B" }
  ];
  const playlist = { id: "p1", title: "Focus", description: "Deep work", source: "local", tracks };
  const { calls, controller, elements } = createHarness({ playlists: [playlist] });

  await controller.renderPlaylistDetail("p1");

  assert.equal(controller.getActiveMinePlaylistId(), "p1");
  assert.equal(controller.getActiveNeteasePlaylist(), null);
  assert.equal(elements.minePlaylistList.hidden, true);
  assert.equal(elements.minePlaylistDetail.hidden, false);
  assert.equal(elements.playlistHeroCover.attrs.style, "cover:Focus");
  assert.equal(elements.playlistHeroTitle.textContent, "Focus");
  assert.equal(elements.playlistHeroDesc.textContent, "Deep work");
  assert.equal(elements.minePlaylistCount.textContent, "2/2 首");
  assert.match(elements.playlistTrackList.innerHTML, /Alpha/);
  assert.equal(calls.load.length, 0);
  assert.equal(calls.rows[0].options.allowRemove, false);
}

{
  const playlist = {
    id: "n1",
    source: "netease",
    sourceId: "source-1",
    title: "Remote",
    cachedTrackCount: 2,
    tracks: []
  };
  const hydrated = {
    ...playlist,
    tracks: [{ id: "r1", title: "Loaded", artist: "Netease" }]
  };
  const { calls, controller, elements } = createHarness({ playlists: [playlist], loadResponse: hydrated });

  await controller.renderPlaylistDetail("n1", { refresh: true });

  assert.deepEqual(calls.load[0].options, { refresh: true });
  assert.equal(controller.getActiveNeteasePlaylist(), hydrated);
  assert.equal(elements.playlistTrackList.innerHTML.includes("Loaded"), true);
  assert.equal(calls.rows[0].options.allowRemove, true);
}

{
  const playlist = {
    id: "n-cached",
    source: "netease",
    sourceId: "source-cached",
    title: "Cached Remote",
    cachedTrackCount: 1,
    tracks: [{ id: "cached-1", title: "Already Loaded", artist: "Netease" }]
  };
  const { calls, controller, elements } = createHarness({ playlists: [playlist] });

  await controller.renderPlaylistDetail("n-cached");

  assert.equal(calls.load.length, 0);
  assert.equal(controller.getActiveNeteasePlaylist(), playlist);
  assert.match(elements.playlistTrackList.innerHTML, /Already Loaded/);
}

{
  const tracks = [
    { id: "a", title: "Kind of Blue", artist: "Miles", mood: "cool" },
    { id: "b", title: "Red Clay", artist: "Freddie", mood: "warm" }
  ];
  const { controller, elements } = createHarness({
    playlists: [{ id: "jazz", source: "local", title: "Jazz", tracks }]
  });

  elements.playlistSearch.value = "blue";
  await controller.renderPlaylistDetail("jazz");

  assert.equal(elements.minePlaylistCount.textContent, "1/2 首");
  assert.match(elements.playlistTrackList.innerHTML, /Kind of Blue/);
  assert.doesNotMatch(elements.playlistTrackList.innerHTML, /Red Clay/);
}

{
  const tracks = [{ id: "a", title: "Alpha" }];
  const { controller, elements } = createHarness({
    playlists: [{ id: "p1", source: "local", title: "Focus", tracks }]
  });
  await controller.renderPlaylistDetail("p1");

  controller.setPlaylistSearchOpen(true);
  assert.equal(elements.playlistSearchBox.classList.contains("is-open"), true);
  assert.equal(elements.playlistSearchToggle.attrs["aria-expanded"], "true");
  assert.equal(elements.playlistSearch.focused, true);

  elements.playlistSearch.value = "nothing";
  controller.setPlaylistSearchOpen(false);
  assert.equal(elements.playlistSearchBox.classList.contains("is-open"), false);
  assert.equal(elements.playlistSearchToggle.attrs["aria-expanded"], "false");
  assert.equal(elements.playlistSearch.value, "");
  assert.match(elements.playlistTrackList.innerHTML, /Alpha/);
}

{
  const { controller } = createHarness({ playlists: [] });

  await controller.renderPlaylistDetail("missing");

  assert.equal(controller.getActiveMinePlaylistId(), "");
}

console.log("frontend-playlist-controller tests passed");
