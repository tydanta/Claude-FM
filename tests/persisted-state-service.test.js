import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createPersistedStateService } from "../src/server/persisted-state-service.js";

const tempDir = await mkdtemp(path.join(os.tmpdir(), "claude-fm-persisted-state-"));
const statePath = path.join(tempDir, "nested", "state.json");

function createState() {
  return {
    isPlaying: false,
    currentIndex: 0,
    volume: 0.74,
    speed: 1,
    preferences: {
      morning: "light",
      focus: "steady",
      night: "soft"
    }
  };
}

try {
  await mkdir(path.dirname(statePath), { recursive: true });

  {
    const state = createState();
    const warnings = [];
    const service = createPersistedStateService({
      state,
      statePath,
      dataDir: path.dirname(statePath),
      getTrackCount: () => 5,
      now: () => new Date("2026-06-05T00:00:00.000Z"),
      warn: (message) => warnings.push(message)
    });

    await service.loadPersistedState();
    assert.equal(state.currentIndex, 0);
    assert.equal(warnings.length, 0);
  }

  await writeFile(statePath, JSON.stringify({
    currentIndex: 12,
    volume: 2,
    speed: 1.25,
    preferences: { focus: "deep", commute: "warm" }
  }), "utf8");

  {
    const state = createState();
    const service = createPersistedStateService({
      state,
      statePath,
      dataDir: path.dirname(statePath),
      getTrackCount: () => 5,
      now: () => new Date("2026-06-05T00:00:00.000Z")
    });

    await service.loadPersistedState();
    assert.equal(state.currentIndex, 2);
    assert.equal(state.volume, 1);
    assert.equal(state.speed, 1.25);
    assert.deepEqual(state.preferences, {
      morning: "light",
      focus: "deep",
      night: "soft",
      commute: "warm"
    });

    state.currentIndex = 3;
    state.volume = 0.25;
    state.speed = 0.9;
    state.preferences = { focus: "calm" };
    await service.savePersistedState();

    assert.deepEqual(JSON.parse(await readFile(statePath, "utf8")), {
      currentIndex: 3,
      volume: 0.25,
      speed: 0.9,
      preferences: { focus: "calm" },
      updatedAt: "2026-06-05T00:00:00.000Z"
    });
  }

  await writeFile(statePath, "{broken json", "utf8");
  {
    const state = createState();
    const warnings = [];
    const service = createPersistedStateService({
      state,
      statePath,
      dataDir: path.dirname(statePath),
      getTrackCount: () => 5,
      warn: (message, detail) => warnings.push([message, detail])
    });

    await service.loadPersistedState();
    assert.equal(state.currentIndex, 0);
    assert.equal(warnings[0][0], "Failed to load persisted state:");
    assert.equal(typeof warnings[0][1], "string");
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

console.log("persisted-state-service tests passed");
