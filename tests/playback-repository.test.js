import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDatabase, initDatabase } from "../src/server/database.js";
import { createPlaybackRepository } from "../src/server/playback-repository.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-playback-"));
const dbPath = path.join(tempDir, "test.sqlite");

try {
  const db = createDatabase(dbPath);
  initDatabase(db);
  const playback = createPlaybackRepository(db);

  const upserted = [];
  const upsertTrack = (track) => {
    upserted.push(track.id);
    db.prepare(`
      INSERT INTO tracks (id, source, source_id, title, artist, cover, duration, src, raw_json)
      VALUES (@id, @source, @sourceId, @title, @artist, @cover, @duration, @src, @rawJson)
      ON CONFLICT(id) DO UPDATE SET
        source = excluded.source,
        source_id = excluded.source_id,
        title = excluded.title,
        artist = excluded.artist,
        cover = excluded.cover,
        duration = excluded.duration,
        src = excluded.src,
        raw_json = excluded.raw_json,
        updated_at = CURRENT_TIMESTAMP
    `).run({
      id: track.id,
      source: track.source,
      sourceId: track.sourceId,
      title: track.title,
      artist: track.artist,
      cover: track.cover,
      duration: track.duration,
      src: track.src,
      rawJson: JSON.stringify(track)
    });
  };

  playback.replaceQueueItems([
    { id: "track-b", source: "netease", sourceId: "200", title: "B", artist: "Beta", cover: "b.jpg", duration: 180, src: "b.mp3" },
    { id: "", source: "netease", sourceId: "skip", title: "Skip" },
    { id: "track-a", source: "local", sourceId: "100", title: "A", artist: "Alpha", cover: "a.jpg", duration: 120, src: "a.mp3" }
  ], { upsertTrack });

  assert.deepEqual(upserted, ["track-b", "track-a"]);
  assert.deepEqual(
    playback.readQueueItems().map((row) => ({
      id: row.id,
      source: row.source,
      sourceId: row.source_id,
      payloadTitle: JSON.parse(row.payloadJson).title
    })),
    [
      { id: "track-b", source: "netease", sourceId: "200", payloadTitle: "B" },
      { id: "track-a", source: "local", sourceId: "100", payloadTitle: "A" }
    ]
  );

  playback.replaceQueueItems([
    { id: "track-a", source: "local", sourceId: "100", title: "A2", artist: "Alpha", cover: "a2.jpg", duration: 121, src: "a2.mp3" }
  ], { upsertTrack });
  assert.deepEqual(playback.readQueueItems().map((row) => row.id), ["track-a"]);

  playback.saveState({
    source: "local",
    trackId: "track-a",
    sourceTrackId: "100",
    playlistId: "playlist-1",
    playlistSourceId: "pl-source",
    position: 42.5,
    duration: 121,
    isPlaying: true,
    payloadJson: JSON.stringify({ track: { id: "track-a" } })
  });

  assert.deepEqual(playback.readState(), {
    source: "local",
    trackId: "track-a",
    sourceTrackId: "100",
    playlistId: "playlist-1",
    playlistSourceId: "pl-source",
    position: 42.5,
    duration: 121,
    isPlaying: true,
    payloadJson: JSON.stringify({ track: { id: "track-a" } }),
    updatedAt: playback.readState().updatedAt
  });

  playback.saveState({
    source: "netease",
    trackId: "track-b",
    sourceTrackId: "200",
    playlistId: "",
    playlistSourceId: "",
    position: 0,
    duration: 180,
    isPlaying: false,
    payloadJson: "{}"
  });
  const updated = playback.readState();
  assert.equal(updated.source, "netease");
  assert.equal(updated.trackId, "track-b");
  assert.equal(updated.isPlaying, false);

  db.close();
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("playback-repository tests passed");
