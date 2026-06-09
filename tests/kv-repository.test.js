import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDatabase, initDatabase } from "../src/server/database.js";
import { createKvRepository } from "../src/server/kv-repository.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-kv-"));
const dbPath = path.join(tempDir, "test.sqlite");

try {
  const db = createDatabase(dbPath);
  initDatabase(db);
  const kv = createKvRepository(db);

  assert.equal(kv.get("missing", "fallback"), "fallback");

  kv.set("netease.cookie", "a=1");
  assert.equal(kv.get("netease.cookie"), "a=1");

  kv.set("netease.cookie", "b=2");
  assert.equal(kv.get("netease.cookie"), "b=2");

  kv.set("empty", "");
  assert.equal(kv.get("empty", "fallback"), "");

  db.close();
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("kv-repository tests passed");
