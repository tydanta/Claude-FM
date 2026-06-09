import { mkdir, rename, rm, stat } from "node:fs/promises";
import { createReadStream, createWriteStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import {
  buildCoverSizedUrl,
  buildShardedCachePath,
  createMediaCacheKey,
  isAllowedNeteaseMediaUrl,
  pickLruCacheVictims,
  parseRangeHeader
} from "./media-cache-utils.js";

const imageMimeByExtension = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"]
]);

const audioMimeByExtension = new Map([
  [".mp3", "audio/mpeg"],
  [".m4a", "audio/mp4"],
  [".mp4", "audio/mp4"],
  [".aac", "audio/aac"],
  [".flac", "audio/flac"]
]);

export function createMediaCacheService({ config, db, getNeteaseSongUrl, logger = console }) {
  const coverRoot = path.join(config.cacheDir, "covers");
  const audioRoot = path.join(config.cacheDir, "audio");
  const audioDownloads = new Map();
  const stats = {
    cover: { hits: 0, misses: 0, downloadedBytes: 0, cleanupRemoved: 0 },
    audio: { hits: 0, misses: 0, downloadedBytes: 0, cleanupRemoved: 0 }
  };

  function touchCover(cacheKey) {
    db.prepare("UPDATE cover_cache SET last_access_at = ? WHERE cache_key = ?").run(Date.now(), cacheKey);
  }

  function touchAudio(cacheKey) {
    db.prepare("UPDATE audio_cache SET last_access_at = ? WHERE cache_key = ?").run(Date.now(), cacheKey);
  }

  async function serveCover(req, res, url) {
    const sourceUrl = url.searchParams.get("url") || "";
    const size = Number(url.searchParams.get("size") || 200);
    if (!isAllowedNeteaseMediaUrl(sourceUrl)) {
      writeJson(res, 400, { ok: false, error: "Cover url must be from music.126.net" });
      return;
    }

    const sizedUrl = buildCoverSizedUrl(sourceUrl, size);
    const cacheKey = createMediaCacheKey([sourceUrl, size]);
    const extension = getExtensionFromUrl(sizedUrl, ".jpg");
    const filePath = buildShardedCachePath(coverRoot, cacheKey, extension);
    const mime = imageMimeByExtension.get(extension) || "image/jpeg";
    const cached = db.prepare("SELECT * FROM cover_cache WHERE cache_key = ? LIMIT 1").get(cacheKey);
    if (cached?.file_path && existsSync(cached.file_path)) {
      stats.cover.hits += 1;
      touchCover(cacheKey);
      res.setHeader?.("x-media-cache", "cover hit");
      streamWholeFile(res, cached.file_path, cached.mime || mime, "public, max-age=31536000, immutable");
      return;
    }
    stats.cover.misses += 1;

    await mkdir(path.dirname(filePath), { recursive: true });
    const response = await fetch(sizedUrl);
    if (!response.ok || !response.body) {
      writeJson(res, 502, { ok: false, error: `Cover fetch failed: ${response.status}` });
      return;
    }
    await pipeline(response.body, createWriteStream(filePath));
    const info = await stat(filePath);
    stats.cover.downloadedBytes += info.size;
    const now = Date.now();
    db.prepare(`
      INSERT INTO cover_cache (cache_key, source_url, sized_url, size, file_path, mime, bytes, status, created_at, updated_at, last_access_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        sized_url = excluded.sized_url,
        size = excluded.size,
        file_path = excluded.file_path,
        mime = excluded.mime,
        bytes = excluded.bytes,
        status = 'ready',
        updated_at = excluded.updated_at,
        last_access_at = excluded.last_access_at
    `).run(cacheKey, sourceUrl, sizedUrl, size, filePath, mime, info.size, now, now, now);
    res.setHeader?.("x-media-cache", "cover miss");
    streamWholeFile(res, filePath, mime, "public, max-age=31536000, immutable");
  }

  async function serveAudio(req, res, url) {
    const songId = String(url.searchParams.get("songId") || url.searchParams.get("id") || "");
    const level = url.searchParams.get("level") || config.neteaseAudioLevel;
    let sourceUrl = url.searchParams.get("url") || "";
    if (!sourceUrl && songId) {
      try {
        sourceUrl = await getNeteaseSongUrl(songId, level);
      } catch (error) {
        if (isNeteaseFreeTrialOnlyError(error)) {
          writeNeteaseFreeTrialOnlyJson(res, songId, error);
          return;
        }
        sourceUrl = "";
      }
    }
    if (!sourceUrl) {
      writeJson(res, 400, { ok: false, error: "Audio songId or url is required" });
      return;
    }
    if (!isAllowedNeteaseMediaUrl(sourceUrl)) {
      writeJson(res, 400, { ok: false, error: "Audio url must be from music.126.net" });
      return;
    }

    const extension = getExtensionFromUrl(sourceUrl, ".mp3");
    const mime = audioMimeByExtension.get(extension) || "audio/mpeg";
    const cacheKey = createMediaCacheKey([songId, sourceUrl, level]);
    const filePath = buildShardedCachePath(audioRoot, cacheKey, extension);
    const cached = db.prepare("SELECT * FROM audio_cache WHERE cache_key = ? LIMIT 1").get(cacheKey);
    if (cached?.status === "ready" && cached.file_path && existsSync(cached.file_path)) {
      stats.audio.hits += 1;
      touchAudio(cacheKey);
      res.setHeader?.("x-media-cache", "audio hit");
      await streamRangeFile(res, cached.file_path, cached.mime || mime, req.headers.range);
      return;
    }
    stats.audio.misses += 1;
    // 首次播放必须边下边播；否则大文件下载完成前，用户会误以为播放器卡死。
    res.setHeader?.("x-media-cache", "audio miss");
    await proxyAudioAndCache({ req, res, sourceUrl, songId, level, cacheKey, filePath, mime });
    return;

  }

  async function preloadCovers(body = {}) {
    const items = Array.isArray(body.items) ? body.items : [];
    const urls = items
      .map((item) => typeof item === "string" ? { url: item, size: body.size || 200 } : item)
      .filter((item) => item?.url)
      .slice(0, 40);
    queueMicrotask(() => {
      urls.forEach((item) => {
        const preloadUrl = new URL("http://local/api/media/cover");
        preloadUrl.searchParams.set("url", item.url);
        preloadUrl.searchParams.set("size", String(item.size || body.size || 200));
        warmCover(preloadUrl).catch((error) => logger.warn?.("Cover preload failed:", formatError(error)));
      });
    });
    return { ok: true, count: urls.length };
  }

  async function preloadAudio(body = {}) {
    const items = Array.isArray(body.items) ? body.items : [];
    const targets = items
      .map((item) => typeof item === "string" ? { songId: item } : item)
      .filter((item) => item?.songId || item?.url)
      .slice(0, 3);
    queueMicrotask(() => {
      targets.forEach((item) => {
        warmAudio(item).catch((error) => logger.warn?.("Audio preload failed:", formatError(error)));
      });
    });
    return { ok: true, count: targets.length, limited: items.length > targets.length };
  }

  function getStats() {
    const cover = db.prepare("SELECT COUNT(*) AS files, COALESCE(SUM(bytes), 0) AS bytes FROM cover_cache WHERE status = 'ready'").get();
    const audio = db.prepare("SELECT COUNT(*) AS files, COALESCE(SUM(bytes), 0) AS bytes FROM audio_cache WHERE status = 'ready'").get();
    return {
      cover: { files: Number(cover?.files || 0), bytes: Number(cover?.bytes || 0), ...stats.cover },
      audio: { files: Number(audio?.files || 0), bytes: Number(audio?.bytes || 0), ...stats.audio }
    };
  }

  async function cleanup({ coverMaxBytes = 768 * 1024 * 1024, audioMaxBytes = 4 * 1024 * 1024 * 1024, protectedAudioKeys = [] } = {}) {
    const coverRemoved = await cleanupTable({
      table: "cover_cache",
      maxBytes: coverMaxBytes,
      protectedKeys: []
    });
    const audioRemoved = await cleanupTable({
      table: "audio_cache",
      maxBytes: audioMaxBytes,
      protectedKeys: protectedAudioKeys
    });
    stats.cover.cleanupRemoved += coverRemoved;
    stats.audio.cleanupRemoved += audioRemoved;
    return { coverRemoved, audioRemoved };
  }

  async function warmCover(url) {
    const sourceUrl = url.searchParams.get("url") || "";
    const size = Number(url.searchParams.get("size") || 200);
    if (!isAllowedNeteaseMediaUrl(sourceUrl)) return;
    const sizedUrl = buildCoverSizedUrl(sourceUrl, size);
    const cacheKey = createMediaCacheKey([sourceUrl, size]);
    const extension = getExtensionFromUrl(sizedUrl, ".jpg");
    const filePath = buildShardedCachePath(coverRoot, cacheKey, extension);
    if (existsSync(filePath)) return;
    await mkdir(path.dirname(filePath), { recursive: true });
    const response = await fetch(sizedUrl);
    if (!response.ok || !response.body) return;
    await pipeline(response.body, createWriteStream(filePath));
    const info = await stat(filePath);
    stats.cover.downloadedBytes += info.size;
    const now = Date.now();
    db.prepare(`
      INSERT INTO cover_cache (cache_key, source_url, sized_url, size, file_path, mime, bytes, status, created_at, updated_at, last_access_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET bytes = excluded.bytes, updated_at = excluded.updated_at, last_access_at = excluded.last_access_at
    `).run(cacheKey, sourceUrl, sizedUrl, size, filePath, imageMimeByExtension.get(extension) || "image/jpeg", info.size, now, now, now);
  }

  async function warmAudio(item = {}) {
    const songId = String(item.songId || item.id || "");
    const level = item.level || config.neteaseAudioLevel;
    const sourceUrl = item.url || (songId ? await getNeteaseSongUrl(songId, level).catch(() => "") : "");
    if (!sourceUrl || !isAllowedNeteaseMediaUrl(sourceUrl)) return;
    const extension = getExtensionFromUrl(sourceUrl, ".mp3");
    const cacheKey = createMediaCacheKey([songId, sourceUrl, level]);
    const filePath = buildShardedCachePath(audioRoot, cacheKey, extension);
    if (existsSync(filePath)) return;
    await downloadAudioToCache({ sourceUrl, songId, level, cacheKey, filePath, mime: audioMimeByExtension.get(extension) || "audio/mpeg" });
  }

  async function proxyAudioAndCache({ req, res, sourceUrl, songId, level, cacheKey, filePath, mime }) {
    const tempPath = `${filePath}.part`;
    await mkdir(path.dirname(filePath), { recursive: true });
    const now = Date.now();
    db.prepare(`
      INSERT INTO audio_cache (cache_key, song_id, source_url, file_path, temp_path, mime, status, created_at, updated_at, last_access_at)
      VALUES (?, ?, ?, ?, ?, ?, 'downloading', ?, ?, ?)
      ON CONFLICT(cache_key) DO UPDATE SET
        temp_path = excluded.temp_path,
        mime = excluded.mime,
        status = 'downloading',
        updated_at = excluded.updated_at,
        last_access_at = excluded.last_access_at
    `).run(cacheKey, Number(songId) || null, sourceUrl, filePath, tempPath, mime, now, now, now);

    const headers = {};
    if (req.headers.range) headers.Range = req.headers.range;
    let response;
    try {
      response = await fetch(sourceUrl, { headers });
    } catch (error) {
      db.prepare("UPDATE audio_cache SET status = 'failed', updated_at = ? WHERE cache_key = ?").run(Date.now(), cacheKey);
      writeJson(res, 502, { ok: false, error: "Audio fetch failed", message: formatError(error) });
      return;
    }
    if (!response.ok && response.status !== 206) {
      writeJson(res, 502, { ok: false, error: `Audio fetch failed: ${response.status}` });
      return;
    }
    copyHeaders(res, response, mime);

    const writePromise = audioDownloads.get(cacheKey) || downloadAudioToCache({ sourceUrl, songId, level, cacheKey, filePath, mime });
    writePromise.catch((error) => logger.warn?.("Audio cache background download failed:", formatError(error)));
    response.body.pipeTo(WritableStreamFromNodeResponse(res)).catch(() => {});
  }

  async function downloadAudioToCache({ sourceUrl, songId, cacheKey, filePath, mime }) {
    const existing = audioDownloads.get(cacheKey);
    if (existing) return existing;
    const task = (async () => {
      const tempPath = `${filePath}.part`;
      await mkdir(path.dirname(filePath), { recursive: true });
      const response = await fetch(sourceUrl);
      if (!response.ok || !response.body) throw new Error(`Audio download failed: ${response.status}`);
      try {
        await pipeline(response.body, createWriteStream(tempPath));
        await rename(tempPath, filePath);
        const info = await stat(filePath);
        stats.audio.downloadedBytes += info.size;
        const now = Date.now();
        db.prepare(`
          INSERT INTO audio_cache (cache_key, song_id, source_url, file_path, temp_path, mime, bytes, total_bytes, status, created_at, updated_at, last_access_at)
          VALUES (?, ?, ?, ?, '', ?, ?, ?, 'ready', ?, ?, ?)
          ON CONFLICT(cache_key) DO UPDATE SET
            file_path = excluded.file_path,
            temp_path = '',
            mime = excluded.mime,
            bytes = excluded.bytes,
            total_bytes = excluded.total_bytes,
            status = 'ready',
            updated_at = excluded.updated_at,
            last_access_at = excluded.last_access_at
        `).run(cacheKey, Number(songId) || null, sourceUrl, filePath, mime, info.size, info.size, now, now, now);
      } catch (error) {
        await rm(tempPath, { force: true }).catch(() => {});
        const now = Date.now();
        db.prepare("UPDATE audio_cache SET status = 'failed', updated_at = ? WHERE cache_key = ?").run(now, cacheKey);
        throw error;
      }
    })();
    audioDownloads.set(cacheKey, task);
    // 后台预加载失败不能变成未处理拒绝，否则一次 403 就会让本地 Node 服务退出。
    task.finally(() => audioDownloads.delete(cacheKey)).catch(() => {});
    return task;
  }

  return {
    serveCover,
    serveAudio,
    preloadCovers,
    preloadAudio,
    getStats,
    cleanup
  };

  async function cleanupTable({ table, maxBytes, protectedKeys }) {
    const rows = db.prepare(`
      SELECT cache_key AS cacheKey, file_path AS filePath, bytes, last_access_at AS lastAccessAt
      FROM ${table}
      WHERE status = 'ready'
      ORDER BY last_access_at ASC
    `).all();
    const protectedSet = new Set(protectedKeys);
    const victims = pickLruCacheVictims(rows.map((row) => ({
      ...row,
      protected: protectedSet.has(row.cacheKey)
    })), maxBytes);
    if (!victims.length) return 0;
    let removed = 0;
    const removeRow = db.prepare(`DELETE FROM ${table} WHERE cache_key = ?`);
    for (const cacheKey of victims) {
      const row = rows.find((item) => item.cacheKey === cacheKey);
      if (!row?.filePath) continue;
      await rm(row.filePath, { force: true }).catch(() => {});
      removeRow.run(cacheKey);
      removed += 1;
    }
    return removed;
  }

}

function getExtensionFromUrl(sourceUrl, fallback) {
  try {
    const extension = path.extname(new URL(sourceUrl).pathname).toLowerCase();
    return extension || fallback;
  } catch {
    return fallback;
  }
}

function streamWholeFile(res, filePath, mime, cacheControl) {
  res.writeHead(200, {
    "content-type": mime,
    "content-length": String(existsSync(filePath) ? statSync(filePath).size : 0),
    "cache-control": cacheControl
  });
  createReadStream(filePath).pipe(res);
}

async function streamRangeFile(res, filePath, mime, rangeHeader) {
  const info = await stat(filePath);
  const range = parseRangeHeader(rangeHeader, info.size);
  if (!range) {
    res.writeHead(200, {
      "content-type": mime,
      "content-length": String(info.size),
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=31536000, immutable"
    });
    createReadStream(filePath).pipe(res);
    return;
  }
  res.writeHead(206, {
    "content-type": mime,
    "content-length": String(range.chunkSize),
    "content-range": `bytes ${range.start}-${range.end}/${info.size}`,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable"
  });
  createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
}

function copyHeaders(res, response, mime) {
  const headers = {
    "content-type": response.headers.get("content-type") || mime,
    "accept-ranges": response.headers.get("accept-ranges") || "bytes",
    "cache-control": "no-store"
  };
  for (const name of ["content-length", "content-range"]) {
    const value = response.headers.get(name);
    if (value) headers[name] = value;
  }
  res.writeHead(response.status === 206 ? 206 : 200, headers);
}

function WritableStreamFromNodeResponse(res) {
  return new WritableStream({
    write(chunk) {
      return new Promise((resolve, reject) => {
        res.write(Buffer.from(chunk), (error) => error ? reject(error) : resolve());
      });
    },
    close() {
      res.end();
    },
    abort() {
      res.destroy();
    }
  });
}

function writeJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function isNeteaseFreeTrialOnlyError(error) {
  return error?.code === "NETEASE_FREE_TRIAL_ONLY";
}

function writeNeteaseFreeTrialOnlyJson(res, songId, error) {
  writeJson(res, 403, {
    ok: false,
    code: "NETEASE_FREE_TRIAL_ONLY",
    error: "这首歌网易云只返回 30 秒试听，暂时无法播放完整版。",
    songId: String(error?.songId || songId || ""),
    trial: error?.trial || null
  });
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
