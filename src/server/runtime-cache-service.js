import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

function hashText(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function isInsideDir(filePath, targetDir) {
  const relative = path.relative(targetDir, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function createRuntimeCacheService({
  config,
  insightCacheDir,
  voiceCacheDir,
  mediaCache,
  cleanupNeteaseUrlCache = () => 0,
  existsImpl = existsSync,
  now = () => Date.now(),
  warn = console.warn,
  log = console.log
}) {
  function isFreshCacheItem(item, ttlHours) {
    if (!item?.createdAt) return false;
    const createdAt = Date.parse(item.createdAt);
    if (!Number.isFinite(createdAt)) return false;
    return now() - createdAt < ttlHours * 60 * 60 * 1000;
  }

  function getInsightCacheKey({
    track = {},
    weather = {},
    timeBlock = "",
    voiceLanguage = "",
    keyFingerprint = ""
  } = {}) {
    return hashText(
      JSON.stringify({
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        weather: weather.summary,
        tempC: weather.tempC,
        timeBlock,
        baseUrl: config.openaiBaseUrl,
        model: config.openaiModel,
        keyFingerprint,
        promptVersion: config.insightPromptVersion,
        voiceLanguage,
        languageMode: voiceLanguage === "en" ? "english-with-chinese" : "chinese-only",
        modelEnabled: Boolean(config.openaiKey && config.openaiKey !== config.openaiBaseUrl)
      })
    );
  }

  async function readCachedInsight(cacheKey) {
    const safeKey = String(cacheKey || "");
    if (!/^[a-f0-9]{64}$/i.test(safeKey)) return null;
    const filePath = path.join(insightCacheDir, `${safeKey}.json`);
    if (!isInsideDir(filePath, insightCacheDir) || !existsImpl(filePath)) return null;
    try {
      const item = JSON.parse(await readFile(filePath, "utf8"));
      if (!isFreshCacheItem(item, config.insightCacheTtlHours)) return null;
      return item.payload || null;
    } catch (error) {
      warn("Failed to read insight cache:", error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  async function writeCachedInsight(cacheKey, payload) {
    const safeKey = String(cacheKey || "");
    if (!/^[a-f0-9]{64}$/i.test(safeKey)) return payload;
    await mkdir(insightCacheDir, { recursive: true });
    const filePath = path.join(insightCacheDir, `${safeKey}.json`);
    if (!isInsideDir(filePath, insightCacheDir)) return payload;
    await writeFile(
      filePath,
      JSON.stringify(
        {
          createdAt: new Date(now()).toISOString(),
          payload
        },
        null,
        2
      )
    );
    return payload;
  }

  async function cleanupCacheDir(targetDir, ttlHours, allowedExtensions) {
    if (!existsImpl(targetDir) || !Number.isFinite(ttlHours) || ttlHours <= 0) return 0;
    const expiresBefore = now() - ttlHours * 60 * 60 * 1000;
    let removed = 0;
    const entries = await readdir(targetDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (allowedExtensions && !allowedExtensions.includes(extension)) continue;
      const filePath = path.join(targetDir, entry.name);
      if (!isInsideDir(filePath, targetDir)) continue;
      try {
        const info = await stat(filePath);
        if (info.mtimeMs >= expiresBefore) continue;
        await rm(filePath, { force: true });
        removed += 1;
      } catch (error) {
        warn("Failed to clean cache file:", error instanceof Error ? error.message : String(error));
      }
    }
    return removed;
  }

  async function cleanupCaches() {
    const [insightRemoved, voiceRemoved] = await Promise.all([
      cleanupCacheDir(insightCacheDir, config.insightCacheTtlHours, [".json"]),
      cleanupCacheDir(voiceCacheDir, config.voiceCacheTtlHours, [".wav", ".mp3"])
    ]);
    const mediaRemoved = await mediaCache.cleanup();
    const neteaseUrlRemoved = cleanupNeteaseUrlCache();
    if (insightRemoved || voiceRemoved || mediaRemoved.coverRemoved || mediaRemoved.audioRemoved || neteaseUrlRemoved) {
      log(`Cache cleanup removed ${insightRemoved} insight, ${voiceRemoved} voice, ${mediaRemoved.coverRemoved} cover, ${mediaRemoved.audioRemoved} audio files, and ${neteaseUrlRemoved} Netease URLs.`);
    }
    return { insightRemoved, voiceRemoved, mediaRemoved, neteaseUrlRemoved };
  }

  function scheduleCacheCleanup() {
    cleanupCaches().catch((error) => {
      warn("Cache cleanup failed:", error instanceof Error ? error.message : String(error));
    });
    const intervalMs = Math.max(1, config.cacheCleanupIntervalHours) * 60 * 60 * 1000;
    setInterval(() => {
      cleanupCaches().catch((error) => {
        warn("Cache cleanup failed:", error instanceof Error ? error.message : String(error));
      });
    }, intervalMs).unref?.();
  }

  async function statsFor(targetDir, allowedExtensions) {
    if (!existsImpl(targetDir)) return { files: 0, bytes: 0 };
    let files = 0;
    let bytes = 0;
    const entries = await readdir(targetDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (allowedExtensions && !allowedExtensions.includes(extension)) continue;
      const filePath = path.join(targetDir, entry.name);
      if (!isInsideDir(filePath, targetDir)) continue;
      try {
        const info = await stat(filePath);
        files += 1;
        bytes += info.size;
      } catch {}
    }
    return { files, bytes };
  }

  async function getCacheStats() {
    const [insight, voice] = await Promise.all([
      statsFor(insightCacheDir, [".json"]),
      statsFor(voiceCacheDir, [".wav", ".mp3"])
    ]);
    return { insight, voice, media: mediaCache.getStats() };
  }

  return {
    hashText,
    isFreshCacheItem,
    getInsightCacheKey,
    readCachedInsight,
    writeCachedInsight,
    cleanupCacheDir,
    cleanupCaches,
    scheduleCacheCleanup,
    getCacheStats
  };
}
