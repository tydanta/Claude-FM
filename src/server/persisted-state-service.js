import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export function createPersistedStateService({
  state,
  statePath,
  dataDir,
  getTrackCount,
  now = () => new Date(),
  warn = console.warn
}) {
  async function loadPersistedState() {
    if (!existsSync(statePath)) return;
    try {
      const saved = JSON.parse(await readFile(statePath, "utf8"));
      const trackCount = getTrackCount();
      if (Number.isInteger(saved.currentIndex) && saved.currentIndex >= 0 && trackCount > 0) {
        state.currentIndex = saved.currentIndex % trackCount;
      }
      if (typeof saved.volume === "number") {
        state.volume = Math.max(0, Math.min(1, saved.volume));
      }
      if (typeof saved.speed === "number") {
        state.speed = saved.speed;
      }
      if (saved.preferences && typeof saved.preferences === "object") {
        state.preferences = { ...state.preferences, ...saved.preferences };
      }
    } catch (error) {
      warn("Failed to load persisted state:", error instanceof Error ? error.message : String(error));
    }
  }

  async function savePersistedState() {
    await mkdir(dataDir, { recursive: true });
    await writeFile(
      statePath,
      JSON.stringify(
        {
          currentIndex: state.currentIndex,
          volume: state.volume,
          speed: state.speed,
          preferences: state.preferences,
          updatedAt: now().toISOString()
        },
        null,
        2
      )
    );
  }

  return {
    loadPersistedState,
    savePersistedState
  };
}
