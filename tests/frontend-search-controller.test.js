import assert from "node:assert/strict";
import { createSearchController } from "../public/modules/netease/searchController.js";

function createElement() {
  return {
    hidden: false,
    disabled: false,
    value: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    scrollTop: 0,
    clientHeight: 0,
    scrollHeight: 0,
    classList: {
      values: new Set(),
      contains(name) {
        return this.values.has(name);
      },
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      }
    }
  };
}

function createHarness({ songsByCall = [], hasMoreByCall = [] } = {}) {
  const calls = {
    search: [],
    renderRows: [],
    renderMinePlaylist: 0,
    mineSearchOpen: [],
    coverPreload: [],
    visiblePreload: []
  };
  const elements = {
    musicSearch: createElement(),
    musicSearchResults: createElement(),
    musicSearchPageBtn: createElement(),
    musicSearchPage: createElement(),
    musicSearchBackBtn: createElement(),
    musicSearchPageTitle: createElement(),
    musicSearchPageCount: createElement(),
    musicSearchPageList: createElement(),
    userProfilePanel: createElement(),
    artistTopbar: createElement(),
    artistProfilePanel: createElement(),
    minePlaylistList: createElement(),
    minePlaylistDetail: createElement(),
    mineArtistDetail: createElement(),
    playlistNameSearch: createElement()
  };
  const controller = createSearchController({
    ...elements,
    documentRef: { body: { dataset: {} } },
    neteaseApi: {
      async searchSongs(params) {
        const index = calls.search.length;
        calls.search.push(params);
        return {
          songs: songsByCall[index] || [],
          hasMore: Boolean(hasMoreByCall[index])
        };
      }
    },
    isMineSearchOpen: () => elements.musicSearch.classList.contains("is-open"),
    renderMinePlaylist: () => calls.renderMinePlaylist += 1,
    setMineSearchOpen: (open) => {
      calls.mineSearchOpen.push(open);
      if (open) elements.musicSearch.classList.add("is-open");
      else elements.musicSearch.classList.remove("is-open");
    },
    renderTrackRow: (track, index, options = {}) => {
      calls.renderRows.push({ track, index, options });
      return `<button data-row="${index}" data-cover="${options.showCover !== false}">${track.title}</button>`;
    },
    renderSearchPreviewItems: (songs) => songs.map((track) => `<i>${track.title}</i>`).join(""),
    getSearchPageTitle: (query) => `搜索 ${query}`,
    getSearchPageCount: (count, hasMore) => `${count}${hasMore ? "+" : ""}`,
    preloadNeteaseCoverSlice: (songs, options) => calls.coverPreload.push({ songs, options }),
    prewarmVisibleCovers: (songs, target) => calls.visiblePreload.push({ songs, target })
  });
  return { calls, elements, controller };
}

{
  const { calls, elements, controller } = createHarness();

  elements.musicSearch.value = "";
  await controller.searchNeteaseMusic();

  assert.deepEqual(controller.getSongs(), []);
  assert.equal(controller.getQuery(), "");
  assert.equal(elements.musicSearchResults.hidden, true);
  assert.equal(calls.renderMinePlaylist, 1);
}

{
  const songs = [{ title: "Alpha" }, { title: "Beta" }];
  const { calls, elements, controller } = createHarness({ songsByCall: [songs], hasMoreByCall: [true] });

  elements.musicSearch.value = "love";
  await controller.searchNeteaseMusic({ limit: 12 });

  assert.deepEqual(calls.search[0], { keywords: "love", limit: 12, offset: 0 });
  assert.equal(controller.getQuery(), "love");
  assert.deepEqual(controller.getSongs(), songs);
  assert.equal(elements.musicSearchResults.hidden, false);
  assert.match(elements.musicSearchResults.innerHTML, /Alpha/);
  assert.equal(calls.coverPreload[0].options.priority, "high");
}

{
  const songs = Array.from({ length: 20 }, (_, index) => ({ title: `Song ${index}` }));
  const { calls, elements, controller } = createHarness({ songsByCall: [songs], hasMoreByCall: [true] });

  elements.musicSearch.classList.add("is-open");
  elements.musicSearch.value = "jazz";
  await controller.openMusicSearchPageFromInput();

  assert.deepEqual(calls.search[0], { keywords: "jazz", limit: 20, offset: 0 });
  assert.equal(elements.musicSearchPage.hidden, false);
  assert.equal(elements.musicSearchBackBtn.hidden, false);
  assert.equal(elements.playlistNameSearch.disabled, true);
  assert.equal(elements.musicSearchPageTitle.textContent, "搜索 jazz");
  assert.equal(elements.musicSearchPageCount.textContent, "20+");
  assert.match(elements.musicSearchPageList.innerHTML, /Song 0/);
  assert.equal(calls.renderRows[0].options.showCover, false);
  assert.equal(elements.musicSearchPageList.innerHTML.includes('data-cover="true"'), false);
  assert.equal(calls.visiblePreload.length, 0);
}

{
  const { calls, elements, controller } = createHarness();

  elements.musicSearch.value = "";
  await controller.openMusicSearchPageFromInput();

  assert.equal(elements.musicSearchPage.hidden, true);
  assert.equal(elements.musicSearchBackBtn.hidden, true);
  assert.equal(elements.playlistNameSearch.disabled, false);
  assert.equal(elements.musicSearchPageTitle.textContent, "");
  assert.equal(elements.musicSearchPageCount.textContent, "");
  assert.equal(elements.musicSearchPageList.innerHTML, "");
  assert.deepEqual(calls.mineSearchOpen, [false]);
  assert.equal(calls.renderMinePlaylist, 1);
}

{
  const first = Array.from({ length: 20 }, (_, index) => ({ title: `First ${index}` }));
  const second = [{ title: "More 1" }, { title: "More 2" }];
  const { calls, elements, controller } = createHarness({
    songsByCall: [first, second],
    hasMoreByCall: [true, false]
  });

  elements.musicSearch.classList.add("is-open");
  elements.musicSearch.value = "more";
  await controller.openMusicSearchPageFromInput();
  elements.musicSearchPage.hidden = false;
  elements.musicSearchPage.scrollTop = 880;
  elements.musicSearchPage.clientHeight = 200;
  elements.musicSearchPage.scrollHeight = 1000;

  await controller.loadMoreMusicSearchResults();

  assert.deepEqual(calls.search[1], { keywords: "more", limit: 10, offset: 20 });
  assert.equal(controller.getSongs().length, 22);
  assert.equal(elements.musicSearchPageCount.textContent, "22");
}

console.log("frontend-search-controller tests passed");
