import assert from "node:assert/strict";
import { createNeteasePlaylistMetadataService } from "../src/server/netease-playlist-metadata-service.js";

function createHarness(overrides = {}) {
  const calls = [];
  const details = new Map();
  const service = createNeteasePlaylistMetadataService({
    getLocalNeteasePlaylistDetail: (id) => details.get(String(id)) || null,
    upsertPlaylist: (playlist) => {
      calls.push(["upsertPlaylist", playlist]);
      details.set(String(playlist.sourceId || playlist.id), { ...playlist, stored: true });
      details.set(String(playlist.id), { ...playlist, stored: true });
    },
    neteaseRequest: async (pathname, params, options) => {
      calls.push(["neteaseRequest", pathname, params, options]);
      return { playlist: { id: params.id, name: "Remote Focus", trackCount: 42, coverImgUrl: "remote.jpg" } };
    },
    normalizeNeteasePlaylist: (playlist, tracks = [], displayOrder = 0) => ({
      id: `netease-playlist-${playlist.id}`,
      source: "netease",
      sourceId: String(playlist.id),
      title: playlist.name,
      cover: playlist.coverImgUrl,
      trackCount: Number(playlist.trackCount || tracks.length || 0),
      displayOrder,
      tracks
    }),
    ...overrides
  });
  return { calls, details, service };
}

{
  const { service } = createHarness();
  assert.equal(service.ensurePlaybackPlaylist(null), null);
  assert.equal(service.ensurePlaybackPlaylist({ title: "Missing id" }), null);
}

{
  const { calls, details, service } = createHarness();
  details.set("pl-1", { id: "netease-playlist-pl-1", sourceId: "pl-1", title: "Cached" });
  const result = service.ensurePlaybackPlaylist({ id: "snapshot", sourceId: "pl-1", title: "Snapshot" });
  assert.equal(result.title, "Cached");
  assert.deepEqual(calls, []);
}

{
  const { calls, service } = createHarness();
  const result = service.ensurePlaybackPlaylist({
    id: "netease-playlist-pl-2",
    sourceId: "pl-2",
    title: "Snapshot",
    tracks: [{ id: "t1" }, { id: "t2" }]
  });
  assert.equal(result.stored, true);
  assert.equal(result.trackCount, 2);
  assert.deepEqual(calls[0], ["upsertPlaylist", {
    id: "netease-playlist-pl-2",
    sourceId: "pl-2",
    title: "Snapshot",
    tracks: [{ id: "t1" }, { id: "t2" }],
    trackCount: 2
  }]);
}

{
  const { service } = createHarness();
  const playlist = { id: "local", title: "Local" };
  assert.equal(await service.refreshNeteasePlaylistMetadata(playlist), playlist);
}

{
  const { calls, service } = createHarness({
    neteaseRequest: async () => {
      throw new Error("remote down");
    }
  });
  const playlist = { id: "netease-playlist-pl-3", sourceId: "pl-3", title: "Local", tracks: [{ id: "t1" }] };
  assert.equal(await service.refreshNeteasePlaylistMetadata(playlist), playlist);
  assert.equal(calls.length, 0);
}

{
  const { calls, service } = createHarness();
  const playlist = {
    id: "netease-playlist-pl-4",
    sourceId: "pl-4",
    title: "Generic",
    displayOrder: 7,
    tracks: [{ id: "local-track" }]
  };
  const result = await service.refreshNeteasePlaylistMetadata(playlist);
  assert.equal(result.title, "Remote Focus");
  assert.equal(result.cover, "remote.jpg");
  assert.equal(result.trackCount, 42);
  assert.equal(result.displayOrder, 7);
  assert.deepEqual(result.tracks, [{ id: "local-track" }]);
  assert.deepEqual(calls[0], ["neteaseRequest", "/playlist/detail", { id: "pl-4" }, { auth: true }]);
  assert.equal(calls[1][0], "upsertPlaylist");
}

console.log("netease-playlist-metadata-service tests passed");
