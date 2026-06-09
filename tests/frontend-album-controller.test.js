import assert from "node:assert/strict";
import { createAlbumController } from "../public/modules/netease/albumController.js";

function createClassList() {
  return {
    values: new Set(),
    toggle(name, active) {
      if (active) this.values.add(name);
      else this.values.delete(name);
    },
    contains(name) {
      return this.values.has(name);
    }
  };
}

function createElement(dataset = {}) {
  return {
    hidden: false,
    textContent: "",
    innerHTML: "",
    dataset: { ...dataset },
    style: {},
    classList: createClassList(),
    setAttribute(name, value) {
      this.attrs = this.attrs || {};
      this.attrs[name] = String(value);
    }
  };
}

const calls = {
  api: [],
  pages: [],
  rows: [],
  covers: []
};

const elements = {
  albumPage: createElement({ page: "album" }),
  albumBackBtn: createElement(),
  albumHeroCover: createElement(),
  albumHeroTitle: createElement(),
  albumHeroDesc: createElement(),
  albumTrackList: createElement()
};

const controller = createAlbumController({
  elements,
  neteaseApi: {
    async getAlbum(params) {
      calls.api.push(params);
      return {
        album: {
          id: params.id,
          name: "Nothing But The Beat",
          description: "Studio album",
          picUrl: "album.jpg",
          artist: { name: "David Guetta" }
        },
        tracks: [
          { id: "netease-song-1", sourceId: "1", title: "Titanium", artist: "David Guetta", cover: "song.jpg" }
        ]
      };
    }
  },
  setAppPage: (page) => calls.pages.push(page),
  getNeteaseCoverProxyUrl: (cover, target) => {
    calls.covers.push({ cover, target });
    return `/cover/${target}/${cover}`;
  },
  renderTrackRow: (track, index, options) => {
    calls.rows.push({ track, index, options });
    return `<button data-row="${index}">${track.title}</button>`;
  },
  findTrackIndex: () => -1
});

await controller.openAlbumPage({ id: "123", name: "Nothing But The Beat" });

assert.deepEqual(calls.api, [{ id: "123" }]);
assert.deepEqual(calls.pages, ["album"]);
assert.equal(elements.albumPage.hidden, false);
assert.equal(elements.albumHeroTitle.textContent, "Nothing But The Beat");
assert.equal(elements.albumHeroDesc.textContent, "Studio album");
assert.match(elements.albumHeroCover.style.backgroundImage, /\/cover\/detail\/album\.jpg/);
assert.match(elements.albumTrackList.innerHTML, /Titanium/);
assert.equal(calls.rows[0].options.actionLabel, "播放");
assert.deepEqual(calls.rows[0].options.actionButtons, ["next", "collect"]);
assert.equal(controller.getActiveAlbumTracks()[0].title, "Titanium");

console.log("frontend album controller tests passed");
