import { normalizeNeteaseAudioLevel as defaultNormalizeNeteaseAudioLevel } from "./netease-adapter.js";

export function createNeteaseMediaService({
  config,
  cacheRepository,
  neteaseRequest,
  normalizeNeteaseAudioLevel = defaultNormalizeNeteaseAudioLevel,
  trackRepository,
  logger = console,
  now = Date.now,
  queueMicrotaskFn = queueMicrotask
}) {
  function isFreeTrialOnlyAudio(item = {}) {
    const trial = item.freeTrialInfo || item.freeTrialPrivilege;
    const trialEnd = Number(item.freeTrialInfo?.end || 0);
    const durationMs = Number(item.time || 0);
    const fee = Number(item.fee || 0);
    const payed = Number(item.payed || 0);
    return Boolean(
      item.url &&
      trial &&
      fee > 0 &&
      payed <= 0 &&
      (trialEnd > 0 || (durationMs > 0 && durationMs <= 31000))
    );
  }

  function createTrialOnlyError(songId, item = {}) {
    const error = new Error(`Netease song ${songId} only returned a free trial audio fragment.`);
    error.code = "NETEASE_FREE_TRIAL_ONLY";
    error.songId = String(songId || "");
    error.trial = {
      time: item.time,
      fee: item.fee,
      payed: item.payed,
      freeTrialInfo: item.freeTrialInfo || null
    };
    return error;
  }

  function getNeteaseUrlCacheTtlMs() {
    const minutes = Number(config.neteaseUrlCacheTtlMinutes);
    return Math.max(1, Number.isFinite(minutes) ? minutes : 20) * 60 * 1000;
  }

  function readNeteaseUrlCache(songId, level = config.neteaseAudioLevel, { allowExpired = false } = {}) {
    return cacheRepository.readNeteaseUrl(songId, level, { allowExpired });
  }

  function writeNeteaseUrlCache(songId, level = config.neteaseAudioLevel, url = "") {
    cacheRepository.writeNeteaseUrl(songId, level, url, { ttlMs: getNeteaseUrlCacheTtlMs() });
  }

  function cleanupNeteaseUrlCache() {
    return cacheRepository.cleanupExpiredNeteaseUrls();
  }

  function getLyricStats(text = "") {
    const value = String(text || "");
    const times = [];
    for (const match of value.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)) {
      const fraction = String(match[3] || "").slice(0, 3).padEnd(3, "0");
      times.push(Number(match[1]) * 60 + Number(match[2]) + Number(fraction || 0) / 1000);
    }
    for (const match of value.matchAll(/^\[(-?\d+),\d+\]/gm)) {
      times.push(Math.max(0, Number(match[1]) / 1000));
    }
    return {
      firstTime: times.length ? Math.min(...times) : Number.POSITIVE_INFINITY,
      lineCount: value.split(/\r?\n/).filter((line) => line.trim()).length
    };
  }

  function getLyricsResponseStats(data = {}) {
    const text = [
      data?.lrc?.lyric || data?.lyric || "",
      data?.yrc?.lyric || data?.yrcLyric || "",
      data?.tlyric?.lyric || data?.translatedLyric || ""
    ].filter(Boolean).join("\n");
    return getLyricStats(text);
  }

  function chooseBetterLyricsResponse(primaryData = null, fallbackData = null) {
    if (!primaryData) return fallbackData;
    if (!fallbackData) return primaryData;
    const primary = getLyricsResponseStats(primaryData);
    const fallback = getLyricsResponseStats(fallbackData);
    if (fallback.firstTime + 1 < primary.firstTime) return fallbackData;
    if (fallback.lineCount > primary.lineCount * 1.25 && fallback.firstTime <= primary.firstTime + 1) {
      return fallbackData;
    }
    return primaryData;
  }

  function readLyricsCache(source, sourceId) {
    return cacheRepository.readLyrics(source, sourceId);
  }

  function writeLyricsCache(source, sourceId, payload = {}) {
    cacheRepository.writeLyrics(source, sourceId, payload);
  }

  async function getNeteaseLyrics(songId, { refresh = false } = {}) {
    const id = String(songId || "");
    if (!id) return null;
    if (!refresh) {
      const cached = readLyricsCache("netease", id);
      if (cached) return cached;
    }
    const [newData, legacyData] = await Promise.all([
      neteaseRequest("/lyric/new", { id }, { auth: true }).catch(() => null),
      neteaseRequest("/lyric", { id }, { auth: true }).catch(() => null)
    ]);
    const data = chooseBetterLyricsResponse(newData, legacyData) || {};
    const payload = {
      source: "netease",
      sourceId: id,
      lyric: data?.lrc?.lyric || "",
      yrcLyric: data?.yrc?.lyric || "",
      translatedLyric: data?.tlyric?.lyric || "",
      romajiLyric: data?.romalrc?.lyric || "",
      raw: data || {},
      cached: false
    };
    writeLyricsCache("netease", id, payload);
    return payload;
  }

  async function getNeteaseSongUrl(songId, level = config.neteaseAudioLevel, { metadata = false, refresh = false } = {}) {
    level = normalizeNeteaseAudioLevel(level || config.neteaseAudioLevel);
    const cached = refresh ? null : readNeteaseUrlCache(songId, level);
    if (cached) {
      return metadata ? { url: cached.url, cached: true, expiresAt: cached.expiresAt } : cached.url;
    }
    const data = await neteaseRequest("/song/url/v1", { id: songId, level }, { auth: true });
    const item = data.data?.[0] || {};
    const url = item.url || "";
    if (isFreeTrialOnlyAudio(item)) throw createTrialOnlyError(songId, item);
    if (url) writeNeteaseUrlCache(songId, level, url);
    return metadata ? { url, cached: false, expiresAt: Number(now()) + getNeteaseUrlCacheTtlMs() } : url;
  }

  function prefetchNeteaseSongUrls(songIds = [], level = config.neteaseAudioLevel, limit = 8) {
    level = normalizeNeteaseAudioLevel(level || config.neteaseAudioLevel);
    const ids = [...new Set(songIds.map((songId) => String(songId || "")).filter(Boolean))].slice(0, limit);
    if (!ids.length) return;
    queueMicrotaskFn(() => {
      ids.forEach((id) => {
        if (readNeteaseUrlCache(id, level)) return;
        getNeteaseSongUrl(id, level).catch((error) => {
          logger.warn("Netease URL prefetch failed:", error instanceof Error ? error.message : String(error));
        });
      });
    });
  }

  async function mapNeteaseTracksWithUrls(tracks, { includeUrls = false } = {}) {
    if (!includeUrls) return tracks;
    const mapped = [];
    for (const track of tracks) {
      let src = track.src;
      if (!src && track.sourceId) {
        src = await getNeteaseSongUrl(track.sourceId).catch(() => "");
        if (src) {
          trackRepository.updateSrc(track.id, src);
        }
      }
      mapped.push({ ...track, src });
    }
    return mapped;
  }

  return {
    getNeteaseUrlCacheTtlMs,
    readNeteaseUrlCache,
    writeNeteaseUrlCache,
    cleanupNeteaseUrlCache,
    readLyricsCache,
    writeLyricsCache,
    getNeteaseLyrics,
    getNeteaseSongUrl,
    prefetchNeteaseSongUrls,
    mapNeteaseTracksWithUrls
  };
}
