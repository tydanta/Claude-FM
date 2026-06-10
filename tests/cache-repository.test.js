import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createCacheRepository } from "../src/server/cache-repository.js";
import { createDatabase, initDatabase } from "../src/server/database.js";
import { removeTempDir } from "./temp-cleanup.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-cache-"));
const dbPath = path.join(tempDir, "test.sqlite");

try {
  const db = createDatabase(dbPath);
  initDatabase(db);
  const cache = createCacheRepository(db);
  const now = 1_000_000;

  assert.equal(cache.readNeteaseUrl("100", "standard", { now }), null);

  cache.writeNeteaseUrl("100", "standard", "https://audio.example/100.mp3", { now, ttlMs: 5000 });
  assert.deepEqual(cache.readNeteaseUrl("100", "standard", { now: now + 1000 }), {
    url: "https://audio.example/100.mp3",
    expiresAt: now + 5000,
    expired: false
  });
  assert.equal(cache.readNeteaseUrl("100", "standard", { now: now + 6000 }), null);
  assert.deepEqual(cache.readNeteaseUrl("100", "standard", { now: now + 6000, allowExpired: true }), {
    url: "https://audio.example/100.mp3",
    expiresAt: now + 5000,
    expired: true
  });
  assert.equal(cache.cleanupExpiredNeteaseUrls({ now: now + 6000 }), 1);
  assert.equal(cache.readNeteaseUrl("100", "standard", { now, allowExpired: true }), null);

  cache.writeLyrics("netease", "200", {
    lyric: "[00:01] hello",
    translatedLyric: "[00:01] 你好",
    romajiLyric: "",
    raw: { lrc: { lyric: "[00:01] hello" } }
  });
  assert.deepEqual(cache.readLyrics("netease", "200"), {
    source: "netease",
    sourceId: "200",
    lyric: "[00:01] hello",
    yrcLyric: "",
    translatedLyric: "[00:01] 你好",
    romajiLyric: "",
    raw: { lrc: { lyric: "[00:01] hello" } },
    cached: true,
    updatedAt: cache.readLyrics("netease", "200").updatedAt
  });

  cache.writeLyrics("netease", "200", {
    lyric: "[00:02] updated",
    translatedLyric: "",
    romajiLyric: "roma",
    raw: { version: 2 }
  });
  const updated = cache.readLyrics("netease", "200");
  assert.equal(updated.lyric, "[00:02] updated");
  assert.equal(updated.romajiLyric, "roma");
  assert.deepEqual(updated.raw, { version: 2 });

  db.close();
} finally {
  await removeTempDir(tempDir);
}

console.log("cache-repository tests passed");
