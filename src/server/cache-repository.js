function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function createCacheRepository(db) {
  const readUrl = db.prepare(`
    SELECT url, expires_at
    FROM netease_url_cache
    WHERE song_id = ? AND level = ?
  `);
  const writeUrl = db.prepare(`
    INSERT INTO netease_url_cache (song_id, level, url, expires_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(song_id, level) DO UPDATE SET
      url = excluded.url,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
  `);
  const cleanupUrl = db.prepare("DELETE FROM netease_url_cache WHERE expires_at <= ?");
  const readLyricsQuery = db.prepare(`
    SELECT *
    FROM lyrics_cache
    WHERE source = ? AND source_id = ?
    LIMIT 1
  `);
  const writeLyricsQuery = db.prepare(`
    INSERT INTO lyrics_cache (source, source_id, lyric, translated_lyric, romaji_lyric, raw_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(source, source_id) DO UPDATE SET
      lyric = excluded.lyric,
      translated_lyric = excluded.translated_lyric,
      romaji_lyric = excluded.romaji_lyric,
      raw_json = excluded.raw_json,
      updated_at = CURRENT_TIMESTAMP
  `);

  function readNeteaseUrl(songId, level, { allowExpired = false, now = Date.now() } = {}) {
    const id = String(songId || "");
    if (!id) return null;
    const row = readUrl.get(id, String(level || ""));
    if (!row?.url) return null;
    const expiresAt = Number(row.expires_at);
    const expired = expiresAt <= Number(now);
    if (!allowExpired && expired) return null;
    return {
      url: row.url,
      expiresAt,
      expired
    };
  }

  function writeNeteaseUrl(songId, level, url = "", { now = Date.now(), ttlMs = 0 } = {}) {
    const id = String(songId || "");
    const src = String(url || "");
    if (!id || !src) return 0;
    // 这里只保存网易云临时播放 URL 和过期时间；封面/音频二进制缓存由 media cache 服务单独管理。
    return writeUrl.run(id, String(level || ""), src, Number(now) + Math.max(0, Number(ttlMs) || 0)).changes || 0;
  }

  function cleanupExpiredNeteaseUrls({ now = Date.now() } = {}) {
    return cleanupUrl.run(Number(now)).changes || 0;
  }

  function readLyrics(source, sourceId) {
    const row = readLyricsQuery.get(String(source || ""), String(sourceId || ""));
    if (!row) return null;
    const raw = parseJson(row.raw_json, {});
    return {
      source: row.source,
      sourceId: row.source_id,
      lyric: row.lyric || "",
      yrcLyric: raw?.yrc?.lyric || raw?.yrcLyric || "",
      translatedLyric: row.translated_lyric || "",
      romajiLyric: row.romaji_lyric || "",
      raw,
      cached: true,
      updatedAt: row.updated_at
    };
  }

  function writeLyrics(source, sourceId, payload = {}) {
    const src = String(source || "");
    const id = String(sourceId || "");
    if (!src || !id) return 0;
    return writeLyricsQuery.run(
      src,
      id,
      String(payload.lyric || ""),
      String(payload.translatedLyric || ""),
      String(payload.romajiLyric || ""),
      JSON.stringify(payload.raw || {})
    ).changes || 0;
  }

  return {
    readNeteaseUrl,
    writeNeteaseUrl,
    cleanupExpiredNeteaseUrls,
    readLyrics,
    writeLyrics
  };
}
