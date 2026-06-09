import assert from "node:assert/strict";
import { hydrateLazyBackgrounds, renderLazyBackgroundAttrs } from "../public/modules/ui/lazyBackgrounds.js";
import { renderTrackRow } from "../public/modules/ui/trackRows.js";
import { renderPlaylistCards } from "../public/modules/netease/playlistView.js";

{
  const attrs = renderLazyBackgroundAttrs("background-image: url('cover.jpg')");
  assert.match(attrs, /data-lazy-background=/);
  assert.doesNotMatch(attrs, /\sstyle=/);
}

{
  const html = renderTrackRow({
    id: "netease-1",
    source: "netease",
    sourceId: "1",
    title: "Song",
    artist: "Artist",
    cover: "https://p1.music.126.net/song.jpg"
  }, 0, { lazyCover: true });
  assert.match(html, /data-lazy-background=/);
  assert.doesNotMatch(html, /mine-track-cover" style=/);
}

{
  const html = renderPlaylistCards([
    {
      id: "p1",
      title: "Playlist",
      subtitle: "Sub",
      cover: "https://p1.music.126.net/playlist.jpg",
      trackCount: 8,
      tracks: []
    }
  ], (cover) => cover, { lazyCovers: true });
  assert.match(html, /data-lazy-background=/);
  assert.doesNotMatch(html, /playlist-cover" style=/);
}

{
  const observed = [];
  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe(element) {
      observed.push({ observer: this, element });
    }
    unobserve(element) {
      element.unobserved = true;
    }
  }
  const element = {
    dataset: { lazyBackground: "background-image: url('cover.jpg')" },
    style: { cssText: "" },
    removeAttribute(name) {
      delete this.dataset.lazyBackground;
      this.removedAttribute = name;
    }
  };
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-lazy-background]");
      return [element];
    }
  };
  hydrateLazyBackgrounds(root, { IntersectionObserverImpl: FakeIntersectionObserver });
  assert.equal(element.style.cssText, "");
  observed[0].observer.callback([{ isIntersecting: true, target: element }], observed[0].observer);
  assert.match(element.style.cssText, /cover\.jpg/);
  assert.equal(element.unobserved, true);
  assert.equal(element.removedAttribute, "data-lazy-background");
}

console.log("frontend-lazy-backgrounds tests passed");
