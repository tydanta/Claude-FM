import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createNorthernSettingsService } from "../src/server/northern-settings-service.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-northern-"));

try {
  const kv = new Map();
  const service = createNorthernSettingsService({
    backgroundDir: tempDir,
    getKv: (key, fallback) => kv.get(key) ?? fallback,
    setKv: (key, value) => kv.set(key, value),
    now: () => 1700000000000,
    randomHex: () => "abc123def0"
  });

  assert.deepEqual(service.getNorthernSettings(), { mode: "dark", imageUrl: "" });

  kv.set("northern.settings", JSON.stringify({ mode: "custom", imageUrl: "/api/background/image/cover.png" }));
  assert.deepEqual(service.getNorthernSettings(), { mode: "custom", imageUrl: "/api/background/image/cover.png" });

  kv.set("northern.settings", "{broken json");
  assert.deepEqual(service.getNorthernSettings(), { mode: "dark", imageUrl: "" });

  assert.deepEqual(service.saveNorthernSettings({ mode: "light", imageUrl: "ignored" }), { mode: "light", imageUrl: "" });
  assert.equal(kv.get("northern.settings"), JSON.stringify({ mode: "light", imageUrl: "" }));

  assert.deepEqual(service.saveNorthernSettings({ mode: "custom", imageUrl: "  /bg.png  " }), {
    mode: "custom",
    imageUrl: "/bg.png"
  });

  assert.deepEqual(service.saveNorthernSettings({ mode: "custom", imageUrl: "" }), { mode: "dark", imageUrl: "" });
  assert.deepEqual(service.saveNorthernSettings({ mode: "unknown" }), { mode: "dark", imageUrl: "" });

  const uploadResult = await service.saveNorthernBackgroundImage({
    image: `data:image/png;base64,${Buffer.from("png-body").toString("base64")}`
  });
  assert.deepEqual(uploadResult, {
    mode: "custom",
    imageUrl: "/api/background/image/northern-1700000000000-abc123def0.png"
  });
  assert.equal(await readFile(path.join(tempDir, "northern-1700000000000-abc123def0.png"), "utf8"), "png-body");

  await assert.rejects(
    () => service.saveNorthernBackgroundImage({ image: "data:text/plain;base64,SGk=" }),
    (error) => error.message === "Unsupported image format" && error.statusCode === 400
  );

  await assert.rejects(
    () => service.saveNorthernBackgroundImage({ image: "data:image/png;base64," }),
    (error) => error.message === "Unsupported image format" && error.statusCode === 400
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("northern-settings-service tests passed");
