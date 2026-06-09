import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRuntimeCacheService } from "../src/server/runtime-cache-service.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-runtime-cache-"));

const insightCacheDir = path.join(tempDir, "insight");
const voiceCacheDir = path.join(tempDir, "voice");
await mkdir(insightCacheDir, { recursive: true });
await mkdir(voiceCacheDir, { recursive: true });

const mediaCleanupCalls = [];
const service = createRuntimeCacheService({
  config: {
    openaiBaseUrl: "https://openai.example",
    openaiModel: "gpt-test",
    openaiKey: "secret-key",
    insightPromptVersion: "prompt-v1",
    insightCacheTtlHours: 1,
    voiceCacheTtlHours: 1,
    cacheCleanupIntervalHours: 1
  },
  insightCacheDir,
  voiceCacheDir,
  mediaCache: {
    async cleanup() {
      mediaCleanupCalls.push("cleanup");
      return { coverRemoved: 2, audioRemoved: 3 };
    },
    getStats() {
      return { cover: { files: 4, bytes: 40 }, audio: { files: 5, bytes: 50 } };
    }
  },
  cleanupNeteaseUrlCache: () => 7
});

{
  const fresh = { createdAt: new Date().toISOString() };
  const stale = { createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() };
  assert.equal(service.isFreshCacheItem(fresh, 1), true);
  assert.equal(service.isFreshCacheItem(stale, 1), false);
  assert.equal(service.isFreshCacheItem({}, 1), false);
}

{
  const keyA = service.getInsightCacheKey({
    track: { id: "1", title: "Song", artist: "Artist" },
    weather: { summary: "晴", tempC: 20 },
    timeBlock: "night",
    voiceLanguage: "zh",
    keyFingerprint: "fp"
  });
  const keyB = service.getInsightCacheKey({
    track: { id: "1", title: "Song", artist: "Artist" },
    weather: { summary: "雨", tempC: 20 },
    timeBlock: "night",
    voiceLanguage: "zh",
    keyFingerprint: "fp"
  });
  assert.match(keyA, /^[a-f0-9]{64}$/);
  assert.notEqual(keyA, keyB);
}

{
  const payload = { insight: { provider: "openai" }, insightError: null };
  const key = service.getInsightCacheKey({
    track: { id: "2", title: "Cached", artist: "Artist" },
    weather: { summary: "阴", tempC: 18 },
    timeBlock: "focus",
    voiceLanguage: "en",
    keyFingerprint: "fp"
  });
  await service.writeCachedInsight(key, payload);
  assert.deepEqual(await service.readCachedInsight(key), payload);
  assert.equal(await service.readCachedInsight("../outside"), null);
}

{
  const staleKey = "stale";
  const stalePath = path.join(insightCacheDir, `${staleKey}.json`);
  await writeFile(stalePath, JSON.stringify({
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    payload: { old: true }
  }), "utf8");
  assert.equal(await service.readCachedInsight(staleKey), null);
  const oldTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
  await import("node:fs/promises").then((fs) => fs.utimes(stalePath, oldTime, oldTime));
}

{
  const oldJson = path.join(insightCacheDir, "old.json");
  const oldTxt = path.join(insightCacheDir, "old.txt");
  const newJson = path.join(insightCacheDir, "new.json");
  await writeFile(oldJson, "{}", "utf8");
  await writeFile(oldTxt, "txt", "utf8");
  await writeFile(newJson, "{}", "utf8");
  const oldTime = new Date(Date.now() - 3 * 60 * 60 * 1000);
  await import("node:fs/promises").then((fs) => Promise.all([
    fs.utimes(oldJson, oldTime, oldTime),
    fs.utimes(oldTxt, oldTime, oldTime)
  ]));
  const removed = await service.cleanupCacheDir(insightCacheDir, 1, [".json"]);
  assert.equal(removed, 2);
  const remaining = await readdir(insightCacheDir);
  assert.equal(remaining.includes("old.txt"), true);
  assert.equal(remaining.includes("new.json"), true);
}

{
  await writeFile(path.join(voiceCacheDir, "voice.wav"), "wav", "utf8");
  await writeFile(path.join(voiceCacheDir, "voice.mp3"), "mp3", "utf8");
  await writeFile(path.join(voiceCacheDir, "skip.txt"), "txt", "utf8");
  const stats = await service.getCacheStats();
  assert.equal(stats.voice.files, 2);
  assert.equal(stats.media.cover.files, 4);
}

{
  const result = await service.cleanupCaches();
  assert.deepEqual(result, {
    insightRemoved: 0,
    voiceRemoved: 0,
    mediaRemoved: { coverRemoved: 2, audioRemoved: 3 },
    neteaseUrlRemoved: 7
  });
  assert.deepEqual(mediaCleanupCalls, ["cleanup"]);
}

await rm(tempDir, { recursive: true, force: true });
console.log("runtime-cache-service tests passed");
