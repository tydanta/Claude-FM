import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createMediaCacheService } from "../src/server/media-cache-service.js";
import { createMediaCacheKey } from "../src/server/media-cache-utils.js";

function createFakeDb() {
  const tables = {
    cover_cache: [],
    audio_cache: []
  };
  return {
    tables,
    prepare(sql) {
      return {
        get(...params) {
          if (/FROM cover_cache/i.test(sql) && /cache_key = \?/i.test(sql)) {
            const key = params[0];
            return tables.cover_cache.find((row) => row.cache_key === key || row.cacheKey === key) || null;
          }
          if (/FROM audio_cache/i.test(sql) && /cache_key = \?/i.test(sql)) {
            const key = params[0];
            return tables.audio_cache.find((row) => row.cache_key === key || row.cacheKey === key) || null;
          }
          if (/FROM cover_cache/i.test(sql) && /COUNT/i.test(sql)) {
            return summarize(tables.cover_cache);
          }
          if (/FROM audio_cache/i.test(sql) && /COUNT/i.test(sql)) {
            return summarize(tables.audio_cache);
          }
          return null;
        },
        all() {
          if (/FROM cover_cache/i.test(sql)) return tables.cover_cache;
          if (/FROM audio_cache/i.test(sql)) return tables.audio_cache;
          return [];
        },
        run(...params) {
          if (/DELETE FROM audio_cache WHERE cache_key = \?/i.test(sql)) {
            const key = params[0];
            const before = tables.audio_cache.length;
            tables.audio_cache = tables.audio_cache.filter((row) => (row.cache_key || row.cacheKey) !== key);
            return { changes: before - tables.audio_cache.length };
          }
          if (/DELETE FROM cover_cache WHERE cache_key = \?/i.test(sql)) {
            const key = params[0];
            const before = tables.cover_cache.length;
            tables.cover_cache = tables.cover_cache.filter((row) => (row.cache_key || row.cacheKey) !== key);
            return { changes: before - tables.cover_cache.length };
          }
          return { changes: 0 };
        }
      };
    }
  };
}

function summarize(rows) {
  const ready = rows.filter((row) => row.status === "ready");
  return {
    files: ready.length,
    bytes: ready.reduce((sum, row) => sum + Number(row.bytes || 0), 0)
  };
}

const db = createFakeDb();
db.tables.cover_cache.push({ cacheKey: "old-cover", filePath: "", bytes: 10, lastAccessAt: 1, status: "ready" });
db.tables.audio_cache.push({ cacheKey: "old-audio", filePath: "", bytes: 20, lastAccessAt: 1, status: "ready" });

const service = createMediaCacheService({
  config: {
    cacheDir: "D:/cache",
    neteaseAudioLevel: "standard"
  },
  db,
  getNeteaseSongUrl: async () => ""
});

const initialStats = service.getStats();
assert.deepEqual(initialStats.cover, {
  files: 1,
  bytes: 10,
  hits: 0,
  misses: 0,
  downloadedBytes: 0,
  cleanupRemoved: 0
});
assert.deepEqual(initialStats.audio, {
  files: 1,
  bytes: 20,
  hits: 0,
  misses: 0,
  downloadedBytes: 0,
  cleanupRemoved: 0
});

const preloadAudio = await service.preloadAudio({
  items: [
    { songId: "1" },
    { songId: "2" },
    { songId: "3" },
    { songId: "4" }
  ]
});
assert.equal(preloadAudio.count, 3);
assert.equal(preloadAudio.limited, true);

{
  const warnings = [];
  const originalFetch = globalThis.fetch;
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);
  globalThis.fetch = async () => ({ ok: false, status: 403, body: null });
  const failedPreloadService = createMediaCacheService({
    config: { cacheDir: path.join(os.tmpdir(), `claude-fm-failed-audio-${Date.now()}`), neteaseAudioLevel: "standard" },
    db: createFakeDb(),
    getNeteaseSongUrl: async () => "https://m701.music.126.net/blocked.mp3",
    logger: { warn: (...args) => warnings.push(args) }
  });
  await failedPreloadService.preloadAudio({ items: [{ songId: "blocked" }] });
  await new Promise((resolve) => setTimeout(resolve, 20));
  process.off("unhandledRejection", onUnhandled);
  globalThis.fetch = originalFetch;
  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0][1]), /Audio download failed: 403/);
  assert.equal(unhandled.length, 0);
}

{
  const error = new Error("trial only");
  error.code = "NETEASE_FREE_TRIAL_ONLY";
  error.songId = "trial";
  error.trial = { freeTrialInfo: { start: 0, end: 30 } };
  const trialDb = createFakeDb();
  const trialService = createMediaCacheService({
    config: { cacheDir: path.join(os.tmpdir(), `claude-fm-trial-audio-${Date.now()}`), neteaseAudioLevel: "standard" },
    db: trialDb,
    getNeteaseSongUrl: async () => {
      throw error;
    }
  });
  const response = createFakeResponse();
  await trialService.serveAudio(
    { headers: {} },
    response,
    new URL("http://localhost/api/media/audio?songId=trial")
  );
  assert.equal(response.status, 403);
  assert.equal(response.headers["cache-control"], "no-store");
  assert.deepEqual(JSON.parse(response.body.toString()), {
    ok: false,
    code: "NETEASE_FREE_TRIAL_ONLY",
    error: "这首歌网易云只返回 30 秒试听，暂时无法播放完整版。",
    songId: "trial",
    trial: { freeTrialInfo: { start: 0, end: 30 } }
  });
  assert.equal(trialDb.tables.audio_cache.length, 0);
}

{
  const cacheDir = path.join(os.tmpdir(), `claude-fm-media-${Date.now()}`);
  const audioFile = path.join(cacheDir, "audio", "aa", "ready.mp3");
  await mkdir(path.dirname(audioFile), { recursive: true });
  await writeFile(audioFile, Buffer.from("0123456789"));
  const sourceUrl = "https://m701.music.126.net/song.mp3";
  const cacheKey = createMediaCacheKey(["1", sourceUrl, "standard"]);
  const rangeDb = createFakeDb();
  rangeDb.tables.audio_cache.push({
    cache_key: cacheKey,
    file_path: audioFile,
    mime: "audio/mpeg",
    status: "ready",
    bytes: 10,
    last_access_at: 1
  });
  const rangeService = createMediaCacheService({
    config: { cacheDir, neteaseAudioLevel: "standard" },
    db: rangeDb,
    getNeteaseSongUrl: async (...args) => {
      throw new Error(`cached range should not refresh song url: ${JSON.stringify(args)}`);
    }
  });
  const response = createFakeResponse();
  await rangeService.serveAudio(
    { headers: { range: "bytes=2-5" } },
    response,
    new URL(`http://localhost/api/media/audio?songId=1&url=${encodeURIComponent(sourceUrl)}`)
  );
  await response.done;
  assert.equal(response.status, 206);
  assert.equal(response.headers["accept-ranges"], "bytes");
  assert.equal(response.headers["content-range"], "bytes 2-5/10");
  assert.equal(response.body.toString(), "2345");
  await rm(cacheDir, { recursive: true, force: true });
}

{
  const originalFetch = globalThis.fetch;
  const cacheDir = path.join(os.tmpdir(), `claude-fm-range-miss-${Date.now()}`);
  globalThis.fetch = async () => {
    throw new Error("fetch failed");
  };
  const rangeMissService = createMediaCacheService({
    config: { cacheDir, neteaseAudioLevel: "standard" },
    db: createFakeDb(),
    getNeteaseSongUrl: async () => "https://m701.music.126.net/song.mp3"
  });
  const response = createFakeResponse();
  await rangeMissService.serveAudio(
    { headers: { range: "bytes=0-4095" } },
    response,
    new URL("http://localhost/api/media/audio?songId=range-miss")
  );
  globalThis.fetch = originalFetch;
  assert.equal(response.status, 502);
  assert.deepEqual(JSON.parse(response.body.toString()), {
    ok: false,
    error: "Audio fetch failed",
    message: "fetch failed"
  });
  await rm(cacheDir, { recursive: true, force: true });
}

{
  const originalFetch = globalThis.fetch;
  const cacheDir = path.join(os.tmpdir(), `claude-fm-range-wait-${Date.now()}`);
  const sourceUrl = "https://m701.music.126.net/song.mp3";
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push([url, options?.headers?.Range || ""]);
    assert.equal(options?.headers?.Range, "bytes=5-9");
    return new Response(Buffer.from("56789"), {
      status: 206,
      headers: {
        "content-type": "audio/mpeg",
        "content-length": "5",
        "content-range": "bytes 5-9/100",
        "accept-ranges": "bytes"
      }
    });
  };
  const rangeWaitService = createMediaCacheService({
    config: { cacheDir, neteaseAudioLevel: "standard" },
    db: createFakeDb(),
    getNeteaseSongUrl: async () => sourceUrl,
    logger: { warn: () => {} }
  });
  const response = createFakeResponse();
  await rangeWaitService.serveAudio(
    { headers: { range: "bytes=5-9" } },
    response,
    new URL("http://localhost/api/media/audio?songId=range-wait")
  );
  await response.done;
  globalThis.fetch = originalFetch;
  assert.equal(response.status, 206);
  assert.equal(response.headers["content-range"], "bytes 5-9/100");
  assert.equal(response.body.toString(), "56789");
  assert.equal(calls[0][1], "bytes=5-9");
  await rm(cacheDir, { recursive: true, force: true });
}

console.log("media-cache-service tests passed");

function createFakeResponse() {
  let resolveDone;
  const chunks = [];
  return {
    status: 0,
    headers: {},
    body: Buffer.alloc(0),
    done: new Promise((resolve) => {
      resolveDone = resolve;
    }),
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    writeHead(status, headers) {
      this.status = status;
      Object.entries(headers || {}).forEach(([name, value]) => {
        this.headers[name.toLowerCase()] = value;
      });
    },
    write(chunk, callback) {
      chunks.push(Buffer.from(chunk));
      callback?.();
    },
    end(chunk) {
      if (chunk) chunks.push(Buffer.from(chunk));
      this.body = Buffer.concat(chunks);
      resolveDone();
    },
    on() {},
    once() {},
    emit() {},
    removeListener() {}
  };
}
