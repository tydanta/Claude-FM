import { registerConversationRoutes } from "./routes/conversation-routes.js";
import { registerContextRoutes } from "./routes/context-routes.js";
import { registerBackgroundRoutes } from "./routes/background-routes.js";
import { registerHealthRoutes } from "./routes/health-routes.js";
import { registerMediaRoutes } from "./routes/media-routes.js";
import { registerNeteaseDiscoveryRoutes } from "./routes/netease-discovery-routes.js";
import { registerNeteaseLibraryRoutes } from "./routes/netease-library-routes.js";
import { registerNeteaseLoginRoutes } from "./routes/netease-login-routes.js";
import { registerNeteasePlaylistRoutes } from "./routes/netease-playlist-routes.js";
import { registerNeteaseRecommendationRoutes } from "./routes/netease-recommendation-routes.js";
import { registerNeteaseSongRoutes } from "./routes/netease-song-routes.js";
import { registerPlaybackRoutes } from "./routes/playback-routes.js";
import { registerPlanRoutes } from "./routes/plan-routes.js";
import { registerRemoteRoutes } from "./routes/remote-routes.js";
import { registerSettingsRoutes } from "./routes/settings-routes.js";
import { registerVoiceRoutes } from "./routes/voice-routes.js";

export function registerApiRoutes(router, deps) {
  registerHealthRoutes(router, {
    config: deps.config,
    getIntegrations: deps.getIntegrations,
    getCacheStats: deps.getCacheStats,
    sendJson: deps.sendJson
  });

  registerMediaRoutes(router, {
    mediaCache: deps.mediaCache,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerSettingsRoutes(router, {
    getEditableSettings: deps.getEditableSettings,
    saveRuntimeSettings: deps.saveRuntimeSettings,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerBackgroundRoutes(router, {
    backgroundDir: deps.backgroundDir,
    getNorthernSettings: deps.getNorthernSettings,
    saveNorthernSettings: deps.saveNorthernSettings,
    saveNorthernBackgroundImage: deps.saveNorthernBackgroundImage,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerRemoteRoutes(router, {
    proxyCapabilityRequest: deps.proxyCapabilityRequest
  });

  registerVoiceRoutes(router, {
    voiceCacheDir: deps.voiceCacheDir,
    sendJson: deps.sendJson
  });

  registerNeteaseLoginRoutes(router, {
    neteaseRequest: deps.neteaseRequest,
    getStoredNeteaseProfile: deps.getStoredNeteaseProfile,
    getLocalNeteasePlaylists: deps.getLocalNeteasePlaylists,
    hasNeteaseLoginCookie: deps.hasNeteaseLoginCookie,
    getNeteaseCookie: deps.getNeteaseCookie,
    setNeteaseCookie: deps.setNeteaseCookie,
    setKv: deps.setKv,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerNeteasePlaylistRoutes(router, {
    getStoredNeteaseProfile: deps.getStoredNeteaseProfile,
    getLocalNeteasePlaylists: deps.getLocalNeteasePlaylists,
    hasNeteaseLoginCookie: deps.hasNeteaseLoginCookie,
    scheduleNeteaseFullSync: deps.scheduleNeteaseFullSync,
    syncNeteaseUserPlaylists: deps.syncNeteaseUserPlaylists,
    syncNeteasePlaylistDetail: deps.syncNeteasePlaylistDetail,
    getLocalNeteasePlaylistDetail: deps.getLocalNeteasePlaylistDetail,
    mapNeteaseTracksWithUrls: deps.mapNeteaseTracksWithUrls,
    isGenericPlaylistDescription: deps.isGenericPlaylistDescription,
    refreshNeteasePlaylistMetadata: deps.refreshNeteasePlaylistMetadata,
    sendJson: deps.sendJson
  });

  registerNeteaseSongRoutes(router, {
    config: deps.config,
    normalizeNeteaseAudioLevel: deps.normalizeNeteaseAudioLevel,
    getNeteaseSongUrl: deps.getNeteaseSongUrl,
    readNeteaseUrlCache: deps.readNeteaseUrlCache,
    getLocalTrackBySourceId: deps.getLocalTrackBySourceId,
    getNeteaseLyrics: deps.getNeteaseLyrics,
    prefetchNeteaseSongUrls: deps.prefetchNeteaseSongUrls,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerNeteaseDiscoveryRoutes(router, {
    neteaseRequest: deps.neteaseRequest,
    normalizeNeteaseTrack: deps.normalizeNeteaseTrack,
    upsertTrack: deps.upsertTrack,
    getLocalNeteaseTrackSearch: deps.getLocalNeteaseTrackSearch,
    getLocalNeteaseArtistPage: deps.getLocalNeteaseArtistPage,
    sendJson: deps.sendJson
  });

  registerNeteaseLibraryRoutes(router, {
    getKv: deps.getKv,
    neteaseRequest: deps.neteaseRequest,
    parseBody: deps.parseBody,
    normalizePlaybackTrack: deps.normalizePlaybackTrack,
    upsertTrack: deps.upsertTrack,
    updateLocalLikeState: deps.updateLocalLikeState,
    syncRemoteLikeState: deps.syncRemoteLikeState,
    enqueueSyncJob: deps.enqueueSyncJob,
    getLocalLikedNeteasePlaylist: deps.getLocalLikedNeteasePlaylist,
    getLocalNeteasePlaylists: deps.getLocalNeteasePlaylists,
    updateLocalPlaylistTracks: deps.updateLocalPlaylistTracks,
    syncRemotePlaylistTracks: deps.syncRemotePlaylistTracks,
    getLocalNeteasePlaylistDetail: deps.getLocalNeteasePlaylistDetail,
    sendJson: deps.sendJson
  });

  registerNeteaseRecommendationRoutes(router, {
    config: deps.config,
    normalizeDailyRecommendDate: deps.normalizeDailyRecommendDate,
    getLocalDateKey: deps.getLocalDateKey,
    getLocalDailyRecommendations: deps.getLocalDailyRecommendations,
    getDailyRecommendPlaylistMeta: deps.getDailyRecommendPlaylistMeta,
    neteaseRequest: deps.neteaseRequest,
    normalizeNeteaseTrack: deps.normalizeNeteaseTrack,
    replaceDailyRecommendations: deps.replaceDailyRecommendations,
    prefetchNeteaseSongUrls: deps.prefetchNeteaseSongUrls,
    sendJson: deps.sendJson
  });

  registerContextRoutes(router, {
    getWeatherLocationFromSearch: deps.getWeatherLocationFromSearch,
    buildNowPayload: deps.buildNowPayload,
    getWeather: deps.getWeather,
    getSchedule: deps.getSchedule,
    getTrackById: deps.getTrackById,
    getTimeBlock: deps.getTimeBlock,
    getInsightForTrack: deps.getInsightForTrack,
    normalizeWeatherLocation: deps.normalizeWeatherLocation,
    getCurrentIndex: deps.getCurrentIndex,
    getTrackCount: deps.getTrackCount,
    prewarmQueue: deps.prewarmQueue,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerPlaybackRoutes(router, {
    state: deps.state,
    getTrackCount: deps.getTrackCount,
    readPlaybackState: deps.readPlaybackState,
    savePlaybackState: deps.savePlaybackState,
    savePersistedState: deps.savePersistedState,
    normalizeWeatherLocation: deps.normalizeWeatherLocation,
    buildNowPayload: deps.buildNowPayload,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerConversationRoutes(router, {
    config: deps.config,
    state: deps.state,
    getCurrentTrack: deps.getCurrentTrack,
    normalizeWeatherLocation: deps.normalizeWeatherLocation,
    getWeather: deps.getWeather,
    getSchedule: deps.getSchedule,
    getTrackById: deps.getTrackById,
    askClaudeForChat: deps.askClaudeForChat,
    fallbackChatReply: deps.fallbackChatReply,
    synthesizeVoice: deps.synthesizeVoice,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });

  registerPlanRoutes(router, {
    getSchedule: deps.getSchedule,
    saveSchedule: deps.saveSchedule,
    parseBody: deps.parseBody,
    sendJson: deps.sendJson
  });
}
