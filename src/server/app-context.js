import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createCacheRepository } from "./cache-repository.js";
import { createConfig, loadEnvFile } from "./config.js";
import { createDailyRecommendationRepository } from "./daily-recommendation-repository.js";
import { createDatabase, initDatabase } from "./database.js";
import { createKvRepository } from "./kv-repository.js";
import { createMediaCacheService } from "./media-cache-service.js";
import { createMimoAdapter } from "./mimo-adapter.js";
import { createNeteaseAdapter } from "./netease-adapter.js";
import { createOpenAIChatAdapter } from "./openai-chat-adapter.js";
import { createPlaybackRepository } from "./playback-repository.js";
import { createPlaylistRepository } from "./playlist-repository.js";
import { createRouter } from "./router.js";
import { createTrackRepository } from "./track-repository.js";
import { createWeatherService } from "./weather-service.js";

export function createAppContext({
  rootDir,
  getNeteaseCookie,
  setNeteaseCookie,
  getNeteaseSongUrl,
  getOpenAIChatUrl,
  synthesizeWithMimoPowerShell
}) {
  loadEnvFile(rootDir);
  const config = createConfig({ rootDir });
  const dataDir = config.dataDir;
  const publicDir = path.join(rootDir, "public");
  const voiceCacheDir = path.join(config.cacheDir, "voice");
  const insightCacheDir = path.join(config.cacheDir, "insight");
  const backgroundDir = path.join(dataDir, "backgrounds");
  const statePath = path.join(dataDir, "state.json");

  mkdir(dataDir, { recursive: true }).catch(() => {});
  const db = createDatabase(config.dbPath);
  initDatabase(db);
  const kv = createKvRepository(db);
  const getKv = kv.get;
  const setKv = kv.set;
  const playbackRepository = createPlaybackRepository(db);
  const trackRepository = createTrackRepository(db);
  const playlistRepository = createPlaylistRepository(db);
  const dailyRecommendationRepository = createDailyRecommendationRepository(db);
  const cacheRepository = createCacheRepository(db);
  const neteaseAdapter = createNeteaseAdapter({
    config,
    getCookie: getNeteaseCookie,
    setCookie: setNeteaseCookie
  });
  const weatherService = createWeatherService({ config });
  const openAIChatAdapter = createOpenAIChatAdapter({
    getUrl: getOpenAIChatUrl,
    getApiKey: () => config.openaiKey
  });
  const mimoAdapter = createMimoAdapter({
    config,
    fallback: synthesizeWithMimoPowerShell
  });
  const apiRouter = createRouter();
  const mediaCache = createMediaCacheService({ config, db, getNeteaseSongUrl });

  return {
    apiRouter,
    backgroundDir,
    cacheRepository,
    config,
    dailyRecommendationRepository,
    dataDir,
    db,
    getKv,
    insightCacheDir,
    mediaCache,
    mimoAdapter,
    neteaseAdapter,
    openAIChatAdapter,
    playbackRepository,
    playlistRepository,
    publicDir,
    setKv,
    statePath,
    trackRepository,
    voiceCacheDir,
    weatherService
  };
}
