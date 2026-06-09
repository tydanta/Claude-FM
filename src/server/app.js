import http from "node:http";
import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAppContext } from "./app-context.js";
import { createAppAdapterEndpointService } from "./app-adapter-endpoint-service.js";
import { createAppHttpService } from "./app-http-service.js";
import { createAiService } from "./ai-service.js";
import { createDailyRecommendationService } from "./daily-recommendation-service.js";
import { envKeyMap, runtimeConfigKeys } from "./config.js";
import { applyCorsHeaders, parseBody, sendJson, serveStatic } from "./http-utils.js";
import { createInsightRuntimeService } from "./insight-runtime-service.js";
import { createNeteaseAuthService } from "./netease-auth-service.js";
import { createNeteaseLibraryService } from "./netease-library-service.js";
import { createNeteaseLocalApiService } from "./netease-local-api-service.js";
import { createNeteaseMediaService } from "./netease-media-service.js";
import { createNeteasePlaylistMetadataService } from "./netease-playlist-metadata-service.js";
import { createNeteaseRemoteSyncService } from "./netease-remote-sync-service.js";
import { createMimoProcessService } from "./mimo-process-service.js";
import { createNowPayloadService } from "./now-payload-service.js";
import { createNorthernSettingsService } from "./northern-settings-service.js";
import { normalizeNeteaseAudioLevel } from "./netease-adapter.js";
import { createPersistedStateService } from "./persisted-state-service.js";
import { createPlaybackStateService } from "./playback-state-service.js";
import { createRemoteCapabilityService } from "./remote-capability-service.js";
import { registerApiRoutes } from "./route-registration.js";
import { createRuntimeCacheService } from "./runtime-cache-service.js";
import { createRuntimeSettingsService } from "./runtime-settings-service.js";
import { createScheduleService } from "./schedule-service.js";
import { createDefaultMockTracks, createTrackCatalogService } from "./track-catalog-service.js";
import { createVoiceService } from "./voice-service.js";
import { createWeatherContextService } from "./weather-context-service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

dns.setDefaultResultOrder?.("ipv4first");

let neteaseMediaService;
let neteaseAuthService;
let neteaseLocalApiService;
let mimoProcessService;
let neteasePlaylistMetadataService;
let appAdapterEndpointService;
let getNeteaseCookie;
let hasNeteaseLoginCookie;
let setNeteaseCookie;
let getStoredNeteaseProfile;
let migrateNeteaseApiBaseUrl;
let getOpenAIChatUrl;
let neteaseRequest;
let runProcess;
let synthesizeWithMimoPowerShell;
let getNeteaseUrlCacheTtlMs;
let readNeteaseUrlCache;
let writeNeteaseUrlCache;
let cleanupNeteaseUrlCache;
let readLyricsCache;
let writeLyricsCache;
let getNeteaseLyrics;
let getNeteaseSongUrl;
let prefetchNeteaseSongUrls;
let mapNeteaseTracksWithUrls;
let getTrackById;
let getTrackCount;
let getCurrentTrack;
let getIntegrations;

const {
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
} = createAppContext({
  rootDir,
  getNeteaseCookie: (...args) => getNeteaseCookie(...args),
  setNeteaseCookie: (...args) => setNeteaseCookie(...args),
  getNeteaseSongUrl: (...args) => getNeteaseSongUrl(...args),
  getOpenAIChatUrl: (...args) => getOpenAIChatUrl(...args),
  synthesizeWithMimoPowerShell: (...args) => synthesizeWithMimoPowerShell(...args)
});

appAdapterEndpointService = createAppAdapterEndpointService({
  config,
  neteaseAdapter
});
({
  getOpenAIChatUrl,
  neteaseRequest
} = appAdapterEndpointService);
neteaseAuthService = createNeteaseAuthService({
  config,
  getKv,
  setKv,
  clearNeteaseUrlCache: () => cleanupNeteaseUrlCache?.() || 0
});
({
  migrateNeteaseApiBaseUrl,
  getNeteaseCookie,
  hasNeteaseLoginCookie,
  setNeteaseCookie,
  getStoredNeteaseProfile
} = neteaseAuthService);
neteaseLocalApiService = createNeteaseLocalApiService({
  config,
  rootDir
});
mimoProcessService = createMimoProcessService({
  config,
  rootDir
});
({
  runProcess,
  synthesizeWithMimoPowerShell
} = mimoProcessService);

const state = {
  isPlaying: false,
  currentIndex: 0,
  volume: 0.74,
  speed: 1,
  messages: [
    {
      role: "system",
      content: "Claude FM 已启动，本地中枢在线。"
    }
  ],
  preferences: {
    morning: "轻快但不要吵",
    focus: "少人声，稳定节奏",
    night: "低能量，温柔收束"
  }
};

const insightCache = new Map();
const northernSettingsService = createNorthernSettingsService({
  backgroundDir,
  getKv,
  setKv
});
const {
  getNorthernSettings,
  saveNorthernSettings,
  saveNorthernBackgroundImage
} = northernSettingsService;
const persistedStateService = createPersistedStateService({
  state,
  statePath,
  dataDir,
  getTrackCount: (...args) => getTrackCount(...args)
});
const {
  loadPersistedState,
  savePersistedState
} = persistedStateService;
const scheduleService = createScheduleService({
  dataDir
});
const {
  getSchedule,
  saveSchedule
} = scheduleService;
const weatherContextService = createWeatherContextService({
  weatherService
});
const {
  getTimeBlock,
  normalizeWeatherLocation,
  getWeatherLocationFromSearch,
  getWeather
} = weatherContextService;
const remoteCapabilityService = createRemoteCapabilityService({
  config,
  parseBody,
  sendJson
});
const {
  proxyCapabilityRequest
} = remoteCapabilityService;
const runtimeSettingsService = createRuntimeSettingsService({
  config,
  rootDir,
  runtimeConfigKeys,
  envKeyMap,
  normalizeNeteaseAudioLevel,
  clearInsightCache: () => insightCache.clear()
});
const {
  maskSecret,
  secretFingerprint,
  getEditableSettings,
  normalizeRuntimeSetting,
  updateEnvFile,
  saveRuntimeSettings
} = runtimeSettingsService;
const aiService = createAiService({
  config,
  openAIChatAdapter,
  mimoAdapter
});
const {
  askClaudeForDjLine,
  askOpenAIForInsight,
  askClaudeForChat,
  fallbackChatReply,
  mockInsight,
  mockChineseInsight
} = aiService;
const voiceService = createVoiceService({
  config,
  rootDir,
  voiceCacheDir,
  mimoAdapter,
  runProcess
});
const {
  sanitizeVoiceText,
  synthesizeVoice
} = voiceService;
const neteaseLibraryService = createNeteaseLibraryService({
  db,
  trackRepository,
  playlistRepository
});
const {
  normalizeNeteaseTrack,
  normalizeNeteasePlaylist,
  isLikedNeteasePlaylist,
  isGenericPlaylistDescription,
  upsertTrack,
  upsertPlaylist,
  replacePlaylistTracks,
  appendPlaylistTracks,
  getLocalTrackById,
  getLocalTrackBySourceId,
  getLocalLikedTracks,
  mapTrackRow,
  getLocalNeteaseTrackSearch,
  getLocalNeteaseArtistPage,
  getLocalNeteasePlaylists,
  getLocalNeteasePlaylistDetail,
  getLocalLikedNeteasePlaylist,
  isLocalTrackLiked,
  findLocalNeteasePlaylistForTrack,
  updateLocalPlaylistTracks,
  updateLocalLikeState,
  enqueueSyncJob
} = neteaseLibraryService;
neteaseMediaService = createNeteaseMediaService({
  config,
  cacheRepository,
  neteaseRequest,
  normalizeNeteaseAudioLevel,
  trackRepository
});
({
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
} = neteaseMediaService);
const neteaseRemoteSyncService = createNeteaseRemoteSyncService({
  config,
  db,
  getStoredNeteaseProfile,
  setKv,
  neteaseRequest,
  normalizeNeteasePlaylist,
  normalizeNeteaseTrack,
  isLikedNeteasePlaylist,
  upsertPlaylist,
  replacePlaylistTracks,
  getLocalNeteasePlaylists,
  getLocalNeteasePlaylistDetail,
  getLocalLikedTracks,
  prefetchNeteaseSongUrls
});
const {
  getStoredNeteaseUserId,
  extractRemotePlaylistTrackIds,
  getRemoteLikedIds,
  getRemotePlaylistTrackIds,
  syncRemoteLikeState,
  syncRemotePlaylistTracks,
  syncNeteaseUserPlaylists,
  syncNeteasePlaylistDetail,
  syncAllNeteasePlaylistDetails,
  scheduleNeteaseFullSync
} = neteaseRemoteSyncService;
const playbackStateService = createPlaybackStateService({
  playbackRepository,
  upsertTrack,
  upsertPlaylist,
  appendPlaylistTracks,
  mapTrackRow,
  isLocalTrackLiked
});
const {
  normalizePlaybackTrack,
  normalizePlaybackPlaylist,
  isRealNeteasePlaylist,
  replacePlaybackQueueItems,
  readPlaybackQueueItems,
  savePlaybackState,
  readPlaybackState
} = playbackStateService;
neteasePlaylistMetadataService = createNeteasePlaylistMetadataService({
  getLocalNeteasePlaylistDetail,
  upsertPlaylist,
  neteaseRequest,
  normalizeNeteasePlaylist
});
const {
  ensurePlaybackPlaylist,
  refreshNeteasePlaylistMetadata
} = neteasePlaylistMetadataService;
const runtimeCacheService = createRuntimeCacheService({
  config,
  insightCacheDir,
  voiceCacheDir,
  mediaCache,
  cleanupNeteaseUrlCache
});
const {
  getInsightCacheKey,
  readCachedInsight,
  writeCachedInsight,
  scheduleCacheCleanup,
  getCacheStats
} = runtimeCacheService;
const dailyRecommendationService = createDailyRecommendationService({
  dailyRecommendationRepository,
  normalizePlaybackTrack,
  mapTrackRow,
  upsertTrack
});
const {
  getLocalDateKey,
  normalizeDailyRecommendDate,
  getDailyRecommendPlaylistMeta,
  getLocalDailyRecommendations,
  getLocalDailyRecommendationPlaylist,
  replaceDailyRecommendations,
  getPlaybackDailyRecommendationPlaylist
} = dailyRecommendationService;

const trackCatalogService = createTrackCatalogService({
  config,
  state,
  tracks: createDefaultMockTracks(),
  getLocalTrackById
});
({
  getTrackById,
  getTrackCount,
  getCurrentTrack,
  getIntegrations
} = trackCatalogService);
const mockTracks = trackCatalogService.tracks;

const insightRuntimeService = createInsightRuntimeService({
  config,
  state,
  tracks: mockTracks,
  insightCache,
  secretFingerprint,
  getInsightCacheKey,
  readCachedInsight,
  writeCachedInsight,
  askOpenAIForInsight,
  mockInsight,
  mockChineseInsight,
  sanitizeVoiceText,
  synthesizeVoice,
  getWeather,
  getSchedule,
  getTimeBlock
});
const {
  getInsightForTrack,
  warmTrackAssets,
  prewarmQueue
} = insightRuntimeService;

const nowPayloadService = createNowPayloadService({
  state,
  tracks: mockTracks,
  getWeather,
  getSchedule,
  readPlaybackState,
  readPlaybackQueueItems,
  savePlaybackState,
  getPlaybackDailyRecommendationPlaylist,
  getLocalNeteasePlaylistDetail,
  findLocalNeteasePlaylistForTrack,
  getLocalTrackById,
  getLocalTrackBySourceId,
  readNeteaseUrlCache,
  isLocalTrackLiked,
  getTimeBlock,
  askClaudeForDjLine,
  getIntegrations,
  getInsightForTrack
});
const {
  buildBasePayload,
  buildNowPayload
} = nowPayloadService;

registerApiRoutes(apiRouter, {
  config,
  getIntegrations,
  getCacheStats,
  mediaCache,
  parseBody,
  sendJson,
  getEditableSettings,
  saveRuntimeSettings,
  backgroundDir,
  getNorthernSettings,
  saveNorthernSettings,
  saveNorthernBackgroundImage,
  proxyCapabilityRequest,
  voiceCacheDir,
  neteaseRequest,
  getStoredNeteaseProfile,
  getLocalNeteasePlaylists,
  hasNeteaseLoginCookie,
  getNeteaseCookie,
  setNeteaseCookie,
  setKv,
  scheduleNeteaseFullSync,
  syncNeteaseUserPlaylists,
  syncNeteasePlaylistDetail,
  getLocalNeteasePlaylistDetail,
  mapNeteaseTracksWithUrls,
  isGenericPlaylistDescription,
  refreshNeteasePlaylistMetadata,
  normalizeNeteaseAudioLevel,
  getNeteaseSongUrl,
  readNeteaseUrlCache,
  getLocalTrackBySourceId,
  getNeteaseLyrics,
  prefetchNeteaseSongUrls,
  normalizeNeteaseTrack,
  upsertTrack,
  getLocalNeteaseTrackSearch,
  getLocalNeteaseArtistPage,
  getKv,
  normalizePlaybackTrack,
  updateLocalLikeState,
  syncRemoteLikeState,
  enqueueSyncJob,
  getLocalLikedNeteasePlaylist,
  updateLocalPlaylistTracks,
  syncRemotePlaylistTracks,
  normalizeDailyRecommendDate,
  getLocalDateKey,
  getLocalDailyRecommendations,
  getDailyRecommendPlaylistMeta,
  replaceDailyRecommendations,
  getWeatherLocationFromSearch,
  buildNowPayload,
  getWeather,
  getSchedule,
  getTrackById,
  getTimeBlock,
  getInsightForTrack,
  normalizeWeatherLocation,
  getCurrentIndex: () => state.currentIndex,
  getTrackCount,
  prewarmQueue,
  state,
  readPlaybackState,
  savePlaybackState,
  savePersistedState,
  getCurrentTrack,
  askClaudeForChat,
  fallbackChatReply,
  synthesizeVoice,
  saveSchedule
});

const appHttpService = createAppHttpService({
  config,
  apiRouter,
  publicDir,
  applyCorsHeaders,
  sendJson,
  serveStatic,
  beforeStart: async () => {
    await neteaseLocalApiService.ensureNeteaseLocalApi();
    migrateNeteaseApiBaseUrl();
  },
  loadPersistedState,
  scheduleCacheCleanup
});

export const startServer = appHttpService.startServer;

