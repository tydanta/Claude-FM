import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDatabase, initDatabase } from "../src/server/database.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-db-"));
const dbPath = path.join(tempDir, "test.sqlite");

try {
  const db = createDatabase(dbPath);
  initDatabase(db);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  assert.equal(tables.includes("tracks"), true);
  assert.equal(tables.includes("playlists"), true);
  assert.equal(tables.includes("cover_cache"), true);
  assert.equal(tables.includes("audio_cache"), true);

  assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
  assert.match(String(db.pragma("journal_mode", { simple: true })).toLowerCase(), /wal/);

  db.close();
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("database tests passed");
