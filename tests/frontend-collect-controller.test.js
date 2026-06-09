import assert from "node:assert/strict";
import { createCollectController } from "../public/modules/netease/collectController.js";

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
    }
  };
}

function createElement(dataset = {}) {
  return {
    hidden: true,
    textContent: "",
    innerHTML: "",
    dataset: { ...dataset },
    attrs: {},
    classList: createClassList(),
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    },
    removeAttribute(name) {
      delete this.attrs[name];
    },
    closest() {
      return null;
    }
  };
}

function createHarness({ playlists = [], collectReject = false } = {}) {
  const calls = {
    collect: [],
    collected: [],
    notices: []
  };
  const elements = {
    collectModal: createElement(),
    collectModalTitle: createElement(),
    collectModalTrack: createElement(),
    collectPlaylistList: createElement()
  };
  const controller = createCollectController({
    elements,
    documentRef: { body: { classList: createClassList() } },
    neteaseApi: {
      async collectTrack(payload) {
        calls.collect.push(payload);
        if (collectReject) throw new Error("offline");
        return { ok: true, pendingSync: false };
      }
    },
    getTrackFromRow: (row) => row,
    getPlaylists: () => playlists,
    getCoverUrl: (cover, target) => `/cover/${target}/${cover}`,
    renderNotice: (message, options) => calls.notices.push({ message, options }),
    onCollected: async (context) => calls.collected.push(context)
  });
  return { calls, controller, elements };
}

{
  const { calls, controller, elements } = createHarness();

  controller.openCollectModal({ title: "Local", artist: "Only" });

  assert.equal(calls.notices[0].message, "这首歌暂时不能收藏到网易云歌单。");
  assert.deepEqual(calls.notices[0].options, { key: "collect-unavailable" });
  assert.equal(elements.collectModal.hidden, true);
}

{
  const { calls, controller, elements } = createHarness({
    playlists: [{ source: "local", id: "local-1", title: "Local" }]
  });

  controller.openCollectModal({ title: "Song", artist: "Artist", sourceId: "song-1" });

  assert.equal(calls.notices[0].message, "还没有同步到网易云歌单。");
  assert.deepEqual(calls.notices[0].options, { key: "collect-no-playlist" });
  assert.equal(elements.collectModal.hidden, true);
}

{
  const { controller, elements } = createHarness({
    playlists: [
      { source: "local", id: "local-1", title: "Local" },
      { source: "netease", sourceId: "pl-1", title: "云歌单", cover: "cover.jpg", trackCount: 12 }
    ]
  });

  controller.openCollectModal({ title: "Song", artist: "Artist", sourceId: "song-1" });

  assert.equal(elements.collectModalTitle.textContent, "选择歌单");
  assert.equal(elements.collectModalTrack.textContent, "正在收藏：Song / Artist");
  assert.match(elements.collectPlaylistList.innerHTML, /data-collect-playlist-id="pl-1"/);
  assert.match(elements.collectPlaylistList.innerHTML, /云歌单/);
  assert.equal(elements.collectModal.hidden, false);
}

{
  const playlists = [{ source: "netease", sourceId: "pl-1", title: "云歌单" }];
  const { calls, controller, elements } = createHarness({ playlists });

  controller.openCollectModal({ title: "Song", artist: "Artist", sourceId: "song-1" });
  await controller.collectTrackToPlaylist("pl-1");

  assert.equal(calls.collect[0].playlistId, "pl-1");
  assert.equal(calls.collect[0].track.sourceId, "song-1");
  assert.equal(calls.collected[0].playlist, playlists[0]);
  assert.equal(calls.collected[0].track.sourceId, "song-1");
  assert.equal(elements.collectModal.hidden, true);
  assert.equal(controller.getCollectTargetTrack(), null);
}

{
  const playlistButton = createElement({ collectPlaylistId: "pl-1" });
  playlistButton.closest = (selector) => selector === "[data-collect-playlist-id]" ? playlistButton : null;
  const { calls, controller, elements } = createHarness({
    playlists: [{ source: "netease", sourceId: "pl-1", title: "云歌单" }],
    collectReject: true
  });

  controller.openCollectModal({ title: "Song", artist: "Artist", sourceId: "song-1" });
  await controller.handlePlaylistListClick({ target: playlistButton });

  assert.equal(playlistButton.attrs["aria-busy"], undefined);
  assert.equal(calls.notices.at(-1).message, "收藏到歌单失败，请稍后再试。");
  assert.deepEqual(calls.notices.at(-1).options, { key: "collect-error" });
  assert.equal(elements.collectModal.hidden, false);
}

console.log("frontend-collect-controller tests passed");
