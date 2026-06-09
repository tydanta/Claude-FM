import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDailyRecommendationRepository } from "../src/server/daily-recommendation-repository.js";
import { createDatabase, initDatabase } from "../src/server/database.js";
import { createTrackRepository } from "../src/server/track-repository.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-daily-"));
const dbPath = path.join(tempDir, "test.sqlite");

try {
  const db = createDatabase(dbPath);
  initDatabase(db);
  const tracks = createTrackRepository(db);
  const daily = createDailyRecommendationRepository(db);
  const upserted = [];

  const upsertTrack = (track) => {
    upserted.push(track.id);
    tracks.upsert(track);
  };
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

  daily.replace("2026-06-03", [makeTrack("100", "First"), makeTrack("200", "Second")], { upsertTrack });
  assert.deepEqual(upserted, ["netease-track-100", "netease-track-200"]);
  assert.deepEqual(
    daily.listByDate("2026-06-03").map((row) => row.source_id),
    ["100", "200"]
  );

  daily.replace("2026-06-03", [makeTrack("300", "Third")], { upsertTrack });
  assert.deepEqual(
    daily.listByDate("2026-06-03").map((row) => row.source_id),
    ["300"]
  );

  daily.replace("2026-06-02", [makeTrack("200", "Second")], { upsertTrack });
  daily.replace("2026-06-01", [makeTrack("100", "First")], { upsertTrack });
  assert.equal(daily.cleanup({ keepDates: ["2026-06-03", "2026-06-02"] }), 1);
  assert.deepEqual(daily.listByDate("2026-06-01"), []);
  assert.deepEqual(
    daily.listByDate("2026-06-02").map((row) => row.source_id),
    ["200"]
  );

  db.close();
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("daily-recommendation-repository tests passed");
