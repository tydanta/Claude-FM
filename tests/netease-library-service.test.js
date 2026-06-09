import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDatabase, initDatabase } from "../src/server/database.js";
import { createNeteaseLibraryService } from "../src/server/netease-library-service.js";
import { createPlaylistRepository } from "../src/server/playlist-repository.js";
import { createTrackRepository } from "../src/server/track-repository.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-netease-library-"));
const dbPath = path.join(tempDir, "test.sqlite");

try {
  const db = createDatabase(dbPath);
  initDatabase(db);
  const service = createNeteaseLibraryService({
    db,
    trackRepository: createTrackRepository(db),
    playlistRepository: createPlaylistRepository(db)
  });

  const track = service.normalizeNeteaseTrack({
    id: 100,
    name: "River",
    ar: [{ id: 1, name: "Luna" }, { id: 2, name: "Echo" }],
    al: { id: 9, name: "Moon", picUrl: "cover.jpg" },
    dt: 201500
  });
  assert.deepEqual({
    id: track.id,
    sourceId: track.sourceId,
    title: track.title,
    artist: track.artist,
    artistId: track.artistId,
    album: track.album,
    albumId: track.albumId,
    cover: track.cover,
    duration: track.duration
  }, {
    id: "netease-100",
    sourceId: "100",
    title: "River",
    artist: "Luna / Echo",
    artistId: "1",
    album: "Moon",
    albumId: "9",
    cover: "cover.jpg",
    duration: 202
  });

  const taggedPlaylist = service.normalizeNeteasePlaylist({
    id: 20,
    name: "Night Mix",
    creator: { nickname: "Tester" },
    tags: ["夜晚", "放松"],
    coverImgUrl: "playlist.jpg"
  }, [track], 4);
  assert.equal(taggedPlaylist.id, "netease-playlist-20");
  assert.equal(taggedPlaylist.description, "夜晚 / 放松 · 共 1 首歌");
  assert.equal(taggedPlaylist.displayOrder, 4);
  assert.equal(service.isGenericPlaylistDescription("共 1 首歌，来自网易云音乐。"), true);
  assert.equal(service.isGenericPlaylistDescription("夜晚 / 放松 · 共 1 首歌"), false);

  service.upsertTrack(track);
  service.upsertPlaylist(taggedPlaylist);
  service.replacePlaylistTracks(taggedPlaylist.id, [track]);
  assert.deepEqual(
    service.getLocalNeteasePlaylistDetail("20").tracks.map((item) => item.sourceId),
    ["100"]
  );

  const second = service.normalizeNeteaseTrack({
    id: 200,
    name: "Window",
    artists: [{ id: 3, name: "Sol" }],
    album: { id: 10, name: "Glass", picUrl: "window.jpg" },
    duration: 90000
  });
  assert.equal(service.appendPlaylistTracks("20", [second]), 1);
  assert.deepEqual(
    service.getLocalNeteasePlaylists().map((playlist) => ({
      sourceId: playlist.sourceId,
      cachedTrackCount: playlist.cachedTrackCount
    })),
    [{ sourceId: "20", cachedTrackCount: 2 }]
  );

  const likedPlaylist = service.normalizeNeteasePlaylist({
    id: 30,
    name: "我喜欢的音乐",
    specialType: 5
  }, [], -100000);
  service.upsertPlaylist(likedPlaylist);
  assert.equal(service.updateLocalLikeState("200", true), 2);
  assert.equal(service.isLocalTrackLiked(second.id, "200"), true);
  assert.equal(service.getLocalLikedNeteasePlaylist().tracks[0].sourceId, "200");
  assert.equal(service.findLocalNeteasePlaylistForTrack({ sourceTrackId: "200" }).sourceId, "30");

  service.updateLocalLikeState("200", false);
  assert.equal(service.isLocalTrackLiked(second.id, "200"), false);

  const syncResult = service.enqueueSyncJob("netease.like", { id: "200", like: true });
  assert.equal(syncResult.changes, 1);
  const syncRow = db.prepare("SELECT type, payload FROM sync_jobs ORDER BY id DESC LIMIT 1").get();
  assert.deepEqual({ type: syncRow.type, payload: JSON.parse(syncRow.payload) }, {
    type: "netease.like",
    payload: { id: "200", like: true }
  });

  db.close();
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("netease-library-service tests passed");
