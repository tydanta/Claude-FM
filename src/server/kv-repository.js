export function createKvRepository(db) {
  function get(key, fallback = "") {
    const row = db.prepare("SELECT value FROM kv_store WHERE key = ?").get(key);
    return row ? row.value : fallback;
  }

  function set(key, value) {
    db.prepare(`
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, String(value || ""));
  }

  return { get, set };
}
