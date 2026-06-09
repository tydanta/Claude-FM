import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDatabase, initDatabase } from "../src/server/database.js";
import { createPlaylistRepository } from "../src/server/playlist-repository.js";
import { createTrackRepository } from "../src/server/track-repository.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-playlist-"));
const dbPath = path.join(tempDir, "test.sqlite");
let db;

try {
  db = createDatabase(dbPath);
  initDatabase(db);
  const tracks = createTrackRepository(db);
  const playlists = createPlaylistRepository(db);

  const upsertTrack = (track) => tracks.upsert(track);
  const makeTrack = (sourceId, title) => ({
    id: `netease-track-${sourceId}`,
    source: "netease",
    sourceId,
    title,
    artist: "Artist",
    artistId: "artist-1",
    album: "Album",
    albumId: "album-1",
    cover: `${sourceId}.jpg`,
    duration: 120,
    src: "",
    raw: { id: sourceId, name: title }
  });

  const first = makeTrack("100", "First");
  const second = makeTrack("200", "Second");
  const third = makeTrack("300", "Third");
  [first, second, third].forEach(upsertTrack);

  playlists.upsert({
    id: "netease-playlist-1",
    source: "netease",
    sourceId: "1",
    title: "Daily Mix",
    subtitle: "Cloud",
    description: "From cache",
    cover: "cover.jpg",
    trackCount: 0,
    displayOrder: 2,
    raw: { creator: { nickname: "Tester" } }
  });
  playlists.upsert({
    id: "netease-liked",
    source: "netease",
    sourceId: "liked",
    title: "我喜欢的音乐",
    subtitle: "Cloud",
    description: "",
    cover: "",
    trackCount: 0,
    displayOrder: -1,
    raw: {}
  });
  playlists.upsert({
    id: "netease-other-liked",
    source: "netease",
    sourceId: "other-liked",
    ownerUserId: "user-b",
    title: "鎴戝枩娆㈢殑闊充箰",
    subtitle: "Cloud",
    description: "",
    cover: "",
    trackCount: 0,
    displayOrder: -1,
    raw: {}
  });
  playlists.upsert({
    id: "netease-owned-a",
    source: "netease",
    sourceId: "owned-a",
    ownerUserId: "user-a",
    title: "Owner A",
    subtitle: "Cloud",
    description: "",
    cover: "",
    trackCount: 0,
    displayOrder: 3,
    raw: {}
  });

  playlists.replaceTracks("netease-playlist-1", [first, second], { upsertTrack });
  playlists.replaceTracks("netease-other-liked", [third], { upsertTrack });
  playlists.replaceTracks("netease-owned-a", [second], { upsertTrack });
  assert.deepEqual(
    playlists.getDetail("1").trackRows.map((row) => row.source_id),
    ["100", "200"]
  );

  assert.equal(playlists.appendTracks("1", [second, third], { upsertTrack }), 1);
  assert.deepEqual(
    playlists.getDetail("1").trackRows.map((row) => row.source_id),
    ["100", "200", "300"]
  );
  assert.equal(playlists.getDetail("1").playlist.track_count, 3);

  assert.deepEqual(
    playlists.list().map((row) => ({ id: row.id, cached: row.cached_track_count })),
    [
      { id: "netease-liked", cached: 0 },
      { id: "netease-other-liked", cached: 1 },
      { id: "netease-playlist-1", cached: 3 },
      { id: "netease-owned-a", cached: 1 }
    ]
  );

  assert.equal(playlists.updateTracks({
    playlistId: "1",
    songIds: ["300"],
    op: "add",
    placement: "prepend",
    getTrackBySourceId: (id) => tracks.findBySourceId(id)
  }), 0);
  assert.deepEqual(
    playlists.getDetail("1").trackRows.map((row) => row.source_id),
    ["300", "100", "200"]
  );

  assert.equal(playlists.updateTracks({
    playlistId: "1",
    songIds: ["200"],
    op: "del",
    getTrackBySourceId: (id) => tracks.findBySourceId(id)
  }), 1);
  assert.deepEqual(
    playlists.getDetail("1").trackRows.map((row) => row.source_id),
    ["300", "100"]
  );

  playlists.replaceTracks("netease-liked", [first], { upsertTrack });
  assert.equal(playlists.findLikedPlaylist().playlist.id, "netease-liked");
  assert.equal(playlists.findForTrack({ sourceTrackId: "100" }).playlist.id, "netease-liked");
  assert.deepEqual(
    playlists.list({ ownerUserId: "user-a" }).map((row) => row.id),
    ["netease-owned-a"]
  );
  assert.equal(playlists.getDetail("owned-a", { ownerUserId: "user-a" }).playlist.id, "netease-owned-a");
  assert.equal(playlists.getDetail("owned-a", { ownerUserId: "user-b" }), null);
  assert.equal(playlists.findLikedPlaylist({ ownerUserId: "user-b" }).playlist.id, "netease-other-liked");
  assert.equal(
    playlists.findForTrack({ sourceTrackId: "300", ownerUserId: "user-b" }).playlist.id,
    "netease-other-liked"
  );

} finally {
  db?.close();
  await rm(tempDir, { recursive: true, force: true });
}

console.log("playlist-repository tests passed");
