import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDatabase, initDatabase } from "../src/server/database.js";
import { createTrackRepository } from "../src/server/track-repository.js";
import { removeTempDir } from "./temp-cleanup.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-track-"));
const dbPath = path.join(tempDir, "test.sqlite");

try {
  const db = createDatabase(dbPath);
  initDatabase(db);
  const tracks = createTrackRepository(db);

  tracks.upsert({
    id: "netease-track-100",
    source: "netease",
    sourceId: "100",
    title: "River",
    artist: "Luna",
    artistId: "artist-1",
    album: "Moon",
    albumId: "album-1",
    cover: "river.jpg",
    duration: 200,
    src: "https://audio.example/river.mp3",
    raw: { ar: [{ id: "artist-1", name: "Luna" }] }
  });
  tracks.upsert({
    id: "netease-track-100",
    source: "netease",
    sourceId: "100",
    title: "River Live",
    artist: "Luna",
    artistId: "artist-1",
    album: "Moon",
    albumId: "album-1",
    cover: "river-live.jpg",
    duration: 210,
    src: "",
    raw: { ar: [{ id: "artist-1", name: "Luna" }] }
  });
  tracks.upsert({
    id: "netease-track-200",
    source: "netease",
    sourceId: "200",
    title: "100% Rain_Cloud",
    artist: "Luna Echo",
    artistId: "artist-1",
    album: "Weather",
    albumId: "album-2",
    cover: "rain.jpg",
    duration: 180,
    src: "",
    raw: { artists: [{ id: "artist-1", name: "Luna Echo" }] }
  });

  assert.equal(tracks.findById("netease-track-100").title, "River Live");
  assert.equal(tracks.findBySourceId("100").src, "https://audio.example/river.mp3");

  tracks.setLike("netease-track-100", "100", true);
  tracks.setLike("netease-track-200", "200", true);
  assert.deepEqual(tracks.listLiked().map((row) => row.source_id).sort(), ["100", "200"]);
  assert.equal(tracks.isLiked("missing", "200"), true);
  tracks.setLike("netease-track-200", "200", false);
  assert.equal(tracks.isLiked("netease-track-200", "200"), false);

  const literalSearch = tracks.searchNetease("100% Rain_", 10);
  assert.deepEqual(literalSearch.map((row) => row.id), ["netease-track-200"]);

  const artistById = tracks.findNeteaseArtistTracks({ id: "artist-1" });
  assert.deepEqual(artistById.map((row) => row.id).sort(), ["netease-track-100", "netease-track-200"]);

  const artistByName = tracks.findNeteaseArtistTracks({ name: "Luna Echo" });
  assert.deepEqual(artistByName.map((row) => row.id), ["netease-track-200"]);

  tracks.updateSrc("netease-track-200", "https://audio.example/rain.mp3");
  assert.equal(tracks.findBySourceId("200").src, "https://audio.example/rain.mp3");

  db.close();
} finally {
  await removeTempDir(tempDir);
}

console.log("track-repository tests passed");
