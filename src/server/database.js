import Database from "better-sqlite3";

export function createDatabase(dbPath) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initDatabase(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT,
      title TEXT NOT NULL,
      artist TEXT,
      artist_id TEXT,
      album TEXT,
      album_id TEXT,
      cover TEXT,
      duration INTEGER,
      src TEXT,
      raw_json TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT,
      owner_user_id TEXT DEFAULT '',
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      cover TEXT,
      track_count INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0,
      raw_json TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT NOT NULL,
      track_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      source_track_id TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS likes (
      track_id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT,
      liked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS netease_url_cache (
      song_id TEXT NOT NULL,
      level TEXT NOT NULL,
      url TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (song_id, level)
    );

    CREATE TABLE IF NOT EXISTS daily_recommend_tracks (
      recommend_date TEXT NOT NULL,
      track_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      source_track_id TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (recommend_date, track_id),
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS playback_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      source TEXT,
      track_id TEXT,
      source_track_id TEXT,
      playlist_id TEXT,
      playlist_source_id TEXT,
      position REAL DEFAULT 0,
      duration REAL DEFAULT 0,
      is_playing INTEGER DEFAULT 0,
      payload_json TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS playback_queue_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position INTEGER NOT NULL,
      track_id TEXT NOT NULL,
      source TEXT,
      source_track_id TEXT,
      payload_json TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lyrics_cache (
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      lyric TEXT,
      translated_lyric TEXT,
      romaji_lyric TEXT,
      raw_json TEXT,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (source, source_id)
    );

    CREATE TABLE IF NOT EXISTS cover_cache (
      cache_key TEXT PRIMARY KEY,
      source_url TEXT NOT NULL,
      sized_url TEXT NOT NULL,
      size INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      mime TEXT,
      bytes INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ready',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_access_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audio_cache (
      cache_key TEXT PRIMARY KEY,
      song_id INTEGER,
      source_url TEXT NOT NULL,
      file_path TEXT NOT NULL,
      temp_path TEXT,
      mime TEXT,
      bytes INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      bitrate INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_access_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_netease_url_cache_expires
      ON netease_url_cache(expires_at);

    CREATE INDEX IF NOT EXISTS idx_daily_recommend_date_position
      ON daily_recommend_tracks(recommend_date, position);

    CREATE INDEX IF NOT EXISTS idx_playback_queue_position
      ON playback_queue_items(position);

    CREATE INDEX IF NOT EXISTS idx_cover_cache_last_access
      ON cover_cache(last_access_at);

    CREATE INDEX IF NOT EXISTS idx_audio_cache_song_id
      ON audio_cache(song_id);

    CREATE INDEX IF NOT EXISTS idx_audio_cache_last_access
      ON audio_cache(last_access_at);
  `);

  // 旧版本歌单表没有 display_order；迁移时保留兼容，避免已有 SQLite 启动失败。
  const playlistColumns = db.prepare("PRAGMA table_info(playlists)").all().map((column) => column.name);
  if (!playlistColumns.includes("display_order")) {
    db.exec("ALTER TABLE playlists ADD COLUMN display_order INTEGER DEFAULT 0");
  }
  if (!playlistColumns.includes("owner_user_id")) {
    db.exec("ALTER TABLE playlists ADD COLUMN owner_user_id TEXT DEFAULT ''");
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_playlists_source_owner
      ON playlists(source, owner_user_id, source_id);
  `);
}
