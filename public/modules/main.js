import {
  getNeteaseAudioProxyUrl,
  getNeteaseCoverProxyUrl,
  isAndroidRuntime,
  normalizeNeteaseDirectMediaUrl,
  buildCoverPreloadPlan,
  preloadNeteaseAudio,
  preloadNeteaseCoverSlice,
  shouldPreloadMoreCovers
} from "./netease/neteaseMedia.js";
import { createNeteaseClient } from "./netease/neteaseClient.js";
import { createMineController } from "./netease/mineController.js";
import { createLoginController } from "./netease/loginController.js";
import {
  getArtistDescription,
  renderArtistAlbums,
  renderArtistPager as renderArtistPagerHtml,
  selectArtistHeroImage
} from "./netease/artistView.js";
import { createArtistController } from "./netease/artistController.js";
import { createAlbumController } from "./netease/albumController.js";
import { createCollectController } from "./netease/collectController.js";
import {
  getPlaylistCover as getPlaylistCoverFromView,
  getPlaylistCoverStyle as getPlaylistCoverStyleFromView,
  getPlaylistDescription as getPlaylistDescriptionFromView,
  renderPlaylistCards
} from "./netease/playlistView.js";
import { createPlaylistController } from "./netease/playlistController.js";
import { getRecommendPanelState } from "./netease/recommendView.js";
import { createRecommendController } from "./netease/recommendController.js";
import {
  getSearchPageCount,
  getSearchPageTitle,
  renderSearchPreviewItems
} from "./netease/searchView.js";
import { createSearchController } from "./netease/searchController.js";
import { createEqualizerRuntimeController } from "./player/equalizerRuntimeController.js";
import { createPlaybackControlSurfaceRuntimeController } from "./player/playbackControlSurfaceRuntimeController.js";
import { createPlaybackProgressRuntimeController } from "./player/playbackProgressRuntimeController.js";
import { createLocalPlaybackModel } from "./player/localPlaybackModel.js";
import {
  buildMockLyrics,
  getLyricIndexAt as getLyricIndexAtFromLines,
  mergeTranslatedLyrics,
  parseLyricText
} from "./player/lyricsController.js";
import { createLyricsRuntimeController } from "./player/lyricsRuntimeController.js";
import { playAudioWithDiagnostics } from "./player/audioPlayDiagnostics.js";
import {
  PLAY_MODES,
  cyclePlayModeId,
  getActiveQueueIndex as getActiveQueueIndexFromState,
  getCurrentIndex as getCurrentIndexFromState,
  getNextIndex as getNextIndexFromState,
  getNextPlaybackIndex as getNextPlaybackIndexFromState,
  getPlaylistTrackPlayMode,
  getPlayableDuration as getPlayableDurationFromState,
  getPlaybackEndAction,
  getSequentialNextIndex as getSequentialNextIndexFromState,
  getValidatedPlayMode,
  isSameTrack as isSameTrackFromState
} from "./player/playbackState.js";
import {
  buildNowPayloadFromPlaybackPayload,
  buildPlaybackPayload,
  createPlaybackPersistence,
  readStoredPlaybackPayload
} from "./player/playbackPersistence.js";
import { createPreloadController } from "./player/preloadController.js";
import { createQueueUiController } from "./player/queueUiController.js";
import {
  buildPlaylistPlaybackState,
  getUpcomingTracks as getUpcomingTracksFromQueue,
  insertTrackAfterCurrent as insertTrackAfterCurrentInQueue,
  removeTrackAtIndex
} from "./player/queueController.js";
import {
  getTrackCoverBackground,
  renderQueueModeControls,
  syncModeButtonView
} from "./player/playerView.js";
import { createApiClient, createRemoteCapabilityBaseUrl } from "./apiClient.js";
import { createAndroidBackNavigationController } from "./androidBackNavigation.js";
import { createAndroidMediaSessionController } from "./androidMediaSession.js";
import { collectDomElements } from "./dom.js";
import { createNavigationShellController } from "./navigationShellController.js";
import { androidCapabilityBaseUrl } from "./runtime/platform.js";
import { getFriendlyModelError } from "./chat/friendlyErrors.js";
import { createSpeechInput } from "./chat/speechInput.js";
import { createVoiceLoader } from "./chat/voiceLoader.js";
import { createCapabilityController } from "./claudio/capabilityController.js";
import { createChatController } from "./claudio/chatController.js";
import { createChatRuntimeController } from "./claudio/chatRuntimeController.js";
import { createInsightController } from "./claudio/insightController.js";
import { createVoiceController } from "./claudio/voiceController.js";
import { readStorage, writeStorage } from "./storage.js";
import { createWeatherLocationController } from "./weatherLocation.js";
import { escapeHtml, formatBytes, formatTime } from "./ui/formatting.js";
import { createClaudioNotices } from "./ui/notices.js";
import { getWeatherIconType, renderClock, renderWeatherIcon } from "./ui/weatherDisplay.js";
import { createNorthernBackgroundRuntimeController } from "./settings/northernBackgroundRuntimeController.js";
import { createApiSettingsRuntimeController } from "./settings/apiSettingsRuntimeController.js";
import {
  createStyledSelectController
} from "./settings/styledSelect.js";
import {
  defaultVoicePresetOptions
} from "./settings/voiceSettings.js";
import { createVoiceSettingsController } from "./settings/voiceSettingsController.js";
import {
  getTrackActionFromEventTarget,
  getPlainArtistText as getPlainArtistTextFromTrack,
  getTrackCoverStyle,
  getTrackFromElement,
  renderArtistLinks,
  renderTrackRow as renderTrackRowHtml
} from "./ui/trackRows.js";

export function bootstrap() {
const {
  audio,
  trackCover,
  trackTitle,
  trackArtist,
  playerPage,
  playerBackBtn,
  playerPageTitle,
  playerPageArtist,
  playerLyrics,
  playerLikeBtn,
  playerProgress,
  playerProgressFill,
  playerElapsed,
  playerDuration,
  playerModeBtn,
  playerPrevBtn,
  playerPlayBtn,
  playerNextBtn,
  playerQueueBtn,
  playerQueuePanel,
  playerQueueList,
  queueSheet,
  queueSheetList,
  queueSheetMode,
  djLine,
  insightBody,
  speakDjBtn,
  playBtn,
  playIcon,
  playModeBtn,
  prevBtn,
  nextBtn,
  likeBtn,
  fmBtn,
  refreshBtn,
  progress,
  progressFill,
  clawdWalker,
  elapsed,
  duration,
  volume,
  lyricLine,
  queueList,
  queueToggle,
  queuePopover,
  queuePanelList,
  nextTrackTitle,
  dailyRecommendCard,
  claudeRecommendCard,
  radioRecommendPanel,
  radioRecommendKicker,
  radioRecommendTitle,
  radioRecommendClose,
  historyRecommendBtn,
  radioRecommendList,
  dailyRecommendMeta,
  dailyRecommendCover,
  dailyRecommendMonth,
  dailyRecommendDay,
  chatForm,
  chatInput,
  sttBtn,
  chatLog,
  djOnlineDot,
  capabilityLine,
  capabilityModel,
  capabilityCache,
  capabilityTtl,
  stageClock,
  stageWeekday,
  stageWeatherTemp,
  weatherIcon,
  equalizer,
  appPages,
  statusTabs,
  musicSearch,
  musicSearchResults,
  musicSearchPageBtn,
  mineSearchSubmit,
  mineStickyTop,
  neteaseLoginBtn,
  neteaseLoginStatus,
  neteaseLoginMethodsPanel,
  neteaseQrPanel,
  neteaseQrImage,
  neteasePasswordLoginForm,
  neteasePasswordSubmitBtn,
  neteasePasswordLoginInputs,
  neteaseProfileName,
  neteaseAvatar,
  neteaseStickyName,
  neteaseStickyAvatar,
  settingsBtn,
  settingsBackBtn,
  northernBackgroundOptions,
  northernBackgroundInput,
  northernBackgroundStatus,
  northernImagePreview,
  voicePresetSelect,
  voiceCustomSelect,
  voiceCustomPrompt,
  voiceCustomSaveBtn,
  voiceCustomDeleteBtn,
  voiceSettingsSaveBtn,
  apiSettingsForm,
  apiSettingsStatus,
  apiSettingsInputs,
  secretToggles,
  userProfilePanel,
  minePlaylistList,
  minePlaylistCount,
  playlistNameSearch,
  musicSearchPage,
  musicSearchBackBtn,
  musicSearchPageTitle,
  musicSearchPageCount,
  musicSearchPageList,
  minePlaylistDetail,
  playlistBackBtn,
  playlistHeroCover,
  playlistHeroTitle,
  playlistHeroDesc,
  playlistTrackList,
  playlistSearchBox,
  playlistSearchToggle,
  playlistSearch,
  artistTopbar,
  artistProfilePanel,
  mineArtistDetail,
  artistBackBtn,
  artistHeroAvatar,
  artistHeroName,
  artistHeroDesc,
  artistTabs,
  artistSongsPanel,
  artistAlbumsPanel,
  artistSongCount,
  artistSongList,
  artistSongPager,
  artistAlbumCount,
  artistAlbumList,
  artistAlbumPager,
  albumPage,
  albumTopbar,
  albumBackBtn,
  albumHeroCover,
  albumHeroTitle,
  albumHeroDesc,
  albumTrackList,
  collectModal,
  collectModalBackdrop,
  collectModalClose,
  collectModalTitle,
  collectModalTrack,
  collectPlaylistList,
  statusEls
} = collectDomElements(document);
const voiceAudio = new Audio();

const remoteCapabilityBaseUrl = createRemoteCapabilityBaseUrl(window.location.search, writeStorage, readStorage);
document.body.dataset.remoteApi = remoteCapabilityBaseUrl || "";

const { renderClaudioNotice, clearClaudioNotice } = createClaudioNotices({ chatLog });

let model = null;
let currentTrackId = "";
let activeQueueIndex = null;
let userStartedPlayback = false;
let playbackIntentVersion = 0;
let djModeEnabled = false;
let playerReturnPage = "radio";
let musicSearchTimer = null;
let neteaseAudioRetryKey = "";
const neteaseFreeTrialOnlySongIds = new Set();
let playMode = getValidatedPlayMode(readStorage("claudio-play-mode"));
const NETEASE_FREE_TRIAL_NOTICE = "这首歌网易云只返回 30 秒试听，暂时无法播放完整版。";
const normalizedVoicePresetOptions = defaultVoicePresetOptions;
let playlistController = null;
let mineController = null;
let albumController = null;
const neteasePlaylistDetailPromises = new Map();
let startupPlaybackRestored = false;
const lyricMocks = {
  "lofi-morning": [
    "把窗边的光调低一点，今天从一段温柔节拍开始。",
    "键盘声落在拍子里，思绪慢慢排成队。",
    "不急，先让第一杯咖啡替你打开早晨。"
  ],
  "city-focus": [
    "城市在远处呼吸，你只需要守住这一小块安静。",
    "旋律不多说话，把注意力留给正在发生的事。",
    "一小段循环，刚好托住一整段专注。"
  ],
  "rain-notes": [
    "雨声把边界揉软，房间里只剩下低低的回响。",
    "慢一点，再慢一点，让今天自然收束。",
    "这首歌像一张便签，提醒你也可以停一下。"
  ]
};

function markPlaybackIntent() {
  playbackIntentVersion += 1;
  return playbackIntentVersion;
}

function isNeteaseFreeTrialOnlyError(error) {
  return error?.code === "NETEASE_FREE_TRIAL_ONLY" || error?.payload?.code === "NETEASE_FREE_TRIAL_ONLY";
}

function getActiveMinePlaylistId() {
  return playlistController?.getActiveMinePlaylistId() || "";
}

function getActiveNeteasePlaylist() {
  return playlistController?.getActiveNeteasePlaylist() || null;
}

function getActivePlaybackPlaylist() {
  const activePlaylist = getActiveNeteasePlaylist();
  if (activePlaylist?.id || activePlaylist?.sourceId || activePlaylist?.tracks?.length) return activePlaylist;
  return model?.state?.playback?.playlist || null;
}

function setActiveNeteasePlaylist(playlist) {
  playlistController?.setActiveNeteasePlaylist(playlist);
}

function clearActivePlaylist() {
  playlistController?.clearActivePlaylist();
}

async function renderPlaylistDetail(...args) {
  return playlistController?.renderPlaylistDetail(...args);
}

function setPlaylistSearchOpen(...args) {
  return playlistController?.setPlaylistSearchOpen(...args);
}

function createId(prefix = "voice") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getAndroidNotificationCover(track = model?.track) {
  const source = track?.cover ? getNeteaseCoverProxyUrl(track.cover, "player") : "";
  if (!source || /^data:/i.test(source)) return source;
  try {
    return String(new URL(source, window.location.href));
  } catch {
    return source;
  }
}

const weatherLocationController = createWeatherLocationController({
  geolocationPlugin: window.Capacitor?.Plugins?.Geolocation,
  navigatorRef: navigator,
  readStorage,
  writeStorage,
  setTimeoutFn: window.setTimeout.bind(window),
  onStatus: (message) => {
    if (statusEls?.voice && message) statusEls.voice.textContent = message;
  },
  onFirstLocationRefresh: () => {
    if (!startupPlaybackRestored && model && !userStartedPlayback) refreshNow({ allowPause: false }).catch(() => {});
  }
});

const {
  api,
  fetchWithTimeout,
  getRemoteProxyUrl,
  resolveApiAssetUrl
} = createApiClient({
  remoteCapabilityBaseUrl,
  localCapabilityBaseUrl: isAndroidRuntime() ? androidCapabilityBaseUrl : "",
  appendWeatherLocationQuery: weatherLocationController.appendQuery
});
const playbackPersistence = createPlaybackPersistence({
  api,
  getPayload: () => buildPlaybackPayload({
    model,
    activePlaylist: getActiveNeteasePlaylist(),
    audio,
    duration: getPlayableDuration(),
    clockOverrideTime: getLyricClockOverride?.(),
    ...getPendingSeekState()
  }),
  getRemoteCapabilityBaseUrl: () => remoteCapabilityBaseUrl,
  navigatorRef: navigator,
  windowRef: window
});
const { persist: persistPlaybackState, persistIfStale: persistPlaybackStateIfStale, saveState } = playbackPersistence;

const neteaseApi = createNeteaseClient(api);
const {
  voiceCache,
  getVoiceForText,
  getPreparedVoiceFromUrl
} = createVoiceLoader({
  api,
  resolveApiAssetUrl,
  getVoiceSettings
});
const {
  appendChatMessage,
  resolvePendingChatMessage
} = createChatController({ chatLog });
const chatRuntimeController = createChatRuntimeController({
  elements: {
    chatInput
  },
  api,
  appendChatMessage,
  resolvePendingChatMessage,
  renderClaudioNotice,
  clearClaudioNotice,
  getFriendlyModelError,
  getTrack: () => model?.track || null,
  getPreferences: () => model?.state?.preferences || {},
  getVoiceSettings,
  getLocation: () => weatherLocationController.getLocation(),
  setAppPage
});
const {
  handleChatSubmit
} = chatRuntimeController;
const {
  closeStyledSelects,
  initStyledSelects,
  syncAllStyledSelects,
  syncStyledSelect
} = createStyledSelectController({
  selects: [voicePresetSelect, voiceCustomSelect, apiSettingsInputs.neteaseAudioLevel]
});
const voiceSettingsController = createVoiceSettingsController({
  elements: {
    voicePresetSelect,
    voiceCustomSelect,
    voiceCustomPrompt
  },
  presets: normalizedVoicePresetOptions,
  readStorage,
  writeStorage,
  createId,
  syncStyledSelect,
  presetFallback: "冰糖"
});
const {
  deleteCurrentCustomVoice,
  initVoiceSettings,
  renderCustomVoiceSelect,
  saveCurrentCustomVoice,
  saveVoiceSettings
} = voiceSettingsController;
const voiceController = createVoiceController({
  audio,
  voiceAudio,
  speakDjBtn,
  djLine,
  chatLog,
  getVoiceForText,
  getPreparedVoiceFromUrl,
  getVoiceCache: () => voiceCache,
  appendChatMessage,
  renderClaudioNotice
});
const {
  autoDjPlayed,
  clearWordHighlight,
  invalidateVoiceWarmup,
  pauseVoiceForMusic,
  pauseVoiceForUser,
  refreshVoiceRuntime,
  resumeVoiceForMusic,
  speakDjLine,
  speakInsightFrom: speakInsightFromController,
  stopSpeech,
  warmInsightVoice
} = voiceController;
const { initSpeechToText } = createSpeechInput({ sttBtn, chatInput, pauseVoiceForUser });

const capabilityController = createCapabilityController({
  statusEls,
  djOnlineDot,
  capabilityLine,
  capabilityModel,
  capabilityCache,
  capabilityTtl,
  remoteCapabilityBaseUrl,
  fetchWithTimeout,
  getRemoteProxyUrl,
  formatBytes,
  documentRef: document
});
const {
  refreshCapabilities,
  renderIntegrations,
  setDjOnline
} = capabilityController;

function getUpcomingTracks(queue = model?.queue || [], count = 3) {
  return getUpcomingTracksFromQueue(queue, getCurrentIndex(queue), playMode, count);
}

const insightController = createInsightController({
  api,
  chatLog,
  djLine,
  getCurrentTrackId: () => currentTrackId,
  getDjModeEnabled: () => djModeEnabled,
  getVoiceSettings,
  getUpcomingTracks,
  getUserStartedPlayback: () => userStartedPlayback,
  getModelDjLine: () => model?.djLine || "",
  renderClaudioNotice,
  clearClaudioNotice,
  getFriendlyModelError,
  renderInsightLoading,
  warmInsightVoice,
  autoSpeakInsight: (trackId) => voiceController.autoSpeakInsight(trackId, () => currentTrackId)
});
const {
  clearInsightCache,
  hasRenderedInsightForTrack,
  invalidateInsightRun,
  loadInsightForTrack,
  preloadQueueInsights,
  renderInsight,
  setCachedInsight
} = insightController;

const preloadController = createPreloadController({
  api,
  getCurrentIndex,
  getPlayMode: () => playMode,
  getDjModeEnabled: () => djModeEnabled,
  getWeatherBody: (body) => weatherLocationController.withBody(body),
  neteaseApi,
  preloadNeteaseAudio,
  preloadNeteaseCoverSlice,
  buildCoverPreloadPlan,
  shouldPreloadMoreCovers,
  preloadQueueInsights,
  setTimeoutFn: window.setTimeout.bind(window)
});
const {
  clearNeteaseUrlWarmCache,
  prewarmMoreCoversOnScroll,
  prewarmVisibleCovers,
  warmUpcomingQueue
} = preloadController;

const apiSettingsRuntimeController = createApiSettingsRuntimeController({
  elements: {
    apiSettingsForm,
    apiSettingsStatus,
    apiSettingsInputs,
    secretToggles
  },
  api,
  documentRef: document,
  syncAllStyledSelects,
  writeStorage,
  voiceCache,
  clearInsightCache,
  clearNeteaseUrlWarmCache,
  clearClaudioNotice,
  refreshCapabilities,
  refreshNow,
  getDjModeEnabled: () => djModeEnabled,
  getCurrentTrackId: () => currentTrackId,
  loadInsightForTrack,
  chatLog
});
const {
  bindApiSettingsEvents,
  loadApiSettings
} = apiSettingsRuntimeController;

const lyricsRuntimeController = createLyricsRuntimeController({
  elements: {
    lyricLine,
    playerLyrics
  },
  audio,
  api,
  neteaseApi,
  lyricMocks,
  buildMockLyrics,
  parseLyricText,
  mergeTranslatedLyrics,
  getLyricIndexAt: getLyricIndexAtFromLines,
  escapeHtml,
  formatTime,
  documentRef: document,
  nowFn: () => Date.now(),
  performanceRef: performance,
  requestAnimationFrameFn: window.requestAnimationFrame.bind(window),
  cancelAnimationFrameFn: window.cancelAnimationFrame.bind(window),
  setTimeoutFn: window.setTimeout.bind(window)
});
const {
  clearLyricClockOverride,
  getPlayerLyricLine,
  getLyricClockOverride,
  handlePlayerLyricsPointerInteraction,
  handlePlayerLyricsScroll,
  loadLyricsForTrack,
  previewPlayerLyricIndex,
  renderLyric,
  resetPlayerLyricUserScroll,
  setLyricClockOverride,
  syncPlayerLyrics
} = lyricsRuntimeController;

const queueUiController = createQueueUiController({
  elements: {
    body: document.body,
    queueList,
    queueToggle,
    queuePopover,
    queuePanelList,
    nextTrackTitle,
    playerQueueBtn,
    playerQueuePanel,
    playerQueueList,
    queueSheet,
    queueSheetList,
    queueSheetMode
  },
  getQueue: () => model?.queue || [],
  getCurrentIndex,
  getNextPlaybackIndex,
  getPlayMode: () => playMode,
  renderQueueModeControls,
  escapeHtml,
  formatTime,
  requestAnimationFrameFn: window.requestAnimationFrame.bind(window),
  setTimeoutFn: window.setTimeout.bind(window),
  clearTimeoutFn: window.clearTimeout.bind(window)
});
const {
  renderGlobalQueueSheet,
  renderQueue,
  renderQueueDock,
  scrollCurrentQueueItem,
  setPlayerQueueOpen,
  setQueueOpen,
  setQueueSheetOpen,
  syncPlayerQueue
} = queueUiController;

let navigationBackStack = [];
let restoringNavigationSnapshot = false;
let suppressNextPageSnapshot = false;

const navigationShellController = createNavigationShellController({
  elements: {
    appPages,
    statusTabs,
    mineStickyTop,
    userProfilePanel,
    musicSearch,
    musicSearchResults,
    settingsBtn,
    settingsBackBtn
  },
  documentRef: document,
  windowRef: window,
  getPlayerReturnPageState: () => playerReturnPage,
  setPlayerReturnPageState: (value) => {
    playerReturnPage = value;
  },
  onBeforePageChange: recordNavigationBeforePageChange,
  onEnterPlayer: syncPlayerDetail,
  onLeavePlayer: () => setPlayerQueueOpen(false),
  setAppPageWithoutSnapshot
});
const {
  bindNavigationShellEvents,
  closeMineSearchIfEmpty: closeMineSearchIfEmptyFromController,
  setAppPage: setAppPageFromController,
  setMineSearchOpen: setMineSearchOpenFromController,
  toggleMineSearchOpen: toggleMineSearchOpenFromController,
  updateMineStickyState: updateMineStickyStateFromController
} = navigationShellController;

const equalizerRuntimeController = createEqualizerRuntimeController({
  elements: { equalizer },
  audio,
  windowRef: window,
  consoleRef: console,
  haveFutureData: HTMLMediaElement.HAVE_FUTURE_DATA
});
const {
  buildEqualizer: buildEqualizerFromController,
  initAudioAnalyser: initAudioAnalyserFromController,
  markEqualizerUnavailable: markEqualizerUnavailableFromController,
  renderEqualizerFrame: renderEqualizerFrameFromController,
  setEqualizerHeights: setEqualizerHeightsFromController,
  setEqualizerVisible: setEqualizerVisibleFromController,
  startEqualizer: startEqualizerFromController,
  stopEqualizer: stopEqualizerFromController
} = equalizerRuntimeController;

const playbackProgressRuntimeController = createPlaybackProgressRuntimeController({
  elements: {
    progress,
    progressFill,
    clawdWalker,
    elapsed,
    duration,
    playerProgress,
    playerProgressFill,
    playerElapsed,
    playerDuration
  },
  audio,
  getPlayableDuration,
  formatTime,
  haveMetadata: HTMLMediaElement.HAVE_METADATA
});
const {
  canSeekAudio: canSeekAudioFromController,
  getPendingSeekState,
  requestAudioSeek: requestAudioSeekFromController,
  resetPendingSeek,
  setProgress: setProgressFromController,
  syncPlayerProgress: syncPlayerProgressFromController,
  tryApplyPendingSeek: tryApplyPendingSeekFromController,
  updateProgressUi: updateProgressUiFromController
} = playbackProgressRuntimeController;

const playbackControlSurfaceRuntimeController = createPlaybackControlSurfaceRuntimeController({
  elements: {
    body: document.body,
    clawdWalker,
    playBtn,
    playerPlayBtn,
    volume
  },
  audio,
  saveState
});
const {
  bindPlaybackControlSurfaceEvents,
  syncPlayUi: syncPlayUiFromController
} = playbackControlSurfaceRuntimeController;
const androidMediaSessionController = createAndroidMediaSessionController({
  getState: () => ({
    track: model?.track || {},
    cover: getAndroidNotificationCover(model?.track),
    liked: isTrackLiked(model?.track),
    playing: !audio.paused,
    position: getAndroidMediaPosition(),
    duration: getPlayableDuration()
  }),
  controls: {
    previous: () => prevBtn?.click(),
    play: () => {
      if (audio.paused) resumeCurrentPlayback().catch(console.error);
    },
    pause: () => {
      if (!audio.paused) pauseCurrentPlayback().catch(console.error);
    },
    playPause: () => toggleCurrentPlayback().catch(console.error),
    next: () => nextBtn?.click(),
    like: () => likeBtn?.click()
  },
  setTimeoutFn: window.setTimeout.bind(window),
  consoleRef: console
});
const {
  bindAndroidMediaSessionEvents,
  syncAndroidMediaSession
} = androidMediaSessionController;

const artistController = createArtistController({
  elements: {
    musicSearch,
    musicSearchPage,
    musicSearchBackBtn,
    userProfilePanel,
    minePlaylistList,
    minePlaylistDetail,
    mineArtistDetail,
    artistTopbar,
    artistProfilePanel,
    artistHeroAvatar,
    artistHeroName,
    artistHeroDesc,
    artistTabs,
    artistSongsPanel,
    artistAlbumsPanel,
    artistSongCount,
    artistSongList,
    artistSongPager,
    artistAlbumCount,
    artistAlbumList,
    artistAlbumPager,
    playlistNameSearch
  },
  neteaseApi,
  getSearchQuery: () => musicSearch?.value || "",
  setSearchInputForArtist: (active) => {
    if (!musicSearch) return;
    musicSearch.value = "";
    musicSearch.placeholder = active ? "搜索该歌手的音乐" : "搜索音乐";
  },
  setAppPage,
  renderTrackRow,
  renderArtistAlbums,
  renderArtistPagerHtml,
  selectArtistHeroImage,
  getArtistDescription,
  getNeteaseCoverProxyUrl,
  prewarmVisibleCovers,
  onOpenArtistPage: () => {
    if (!restoringNavigationSnapshot) {
      pushNavigationSnapshot();
      suppressNextPageSnapshot = true;
    }
    clearActivePlaylist();
    resetAlbumState?.();
  },
  documentRef: document
});
const {
  getActiveArtistSource,
  getActiveArtistTracks,
  moveArtistPage,
  openArtistPage,
  renderArtistContent,
  resetArtistPage,
  resetArtistState,
  setActiveArtistTab
} = artistController;

albumController = createAlbumController({
  elements: {
    albumPage,
    albumHeroCover,
    albumHeroTitle,
    albumHeroDesc,
    albumTrackList
  },
  neteaseApi,
  setAppPage,
  getNeteaseCoverProxyUrl,
  renderTrackRow,
  findTrackIndex,
  onOpenAlbumPage: () => {
    if (!restoringNavigationSnapshot) {
      pushNavigationSnapshot();
      suppressNextPageSnapshot = true;
    }
    clearActivePlaylist();
  }
});
const {
  getActiveAlbumId,
  getActiveAlbumTracks,
  openAlbumPage,
  resetAlbumState
} = albumController;

playlistController = createPlaylistController({
  elements: {
    minePlaylistList,
    minePlaylistDetail,
    mineArtistDetail,
    musicSearchPage,
    artistTopbar,
    artistProfilePanel,
    userProfilePanel,
    playlistNameSearch,
    playlistHeroCover,
    playlistHeroTitle,
    playlistHeroDesc,
    playlistTrackList,
    playlistSearchBox,
    playlistSearchToggle,
    playlistSearch,
    minePlaylistCount
  },
  getMinePlaylists,
  loadPlaylistDetail: loadNeteasePlaylistDetail,
  resetArtistState,
  getPlaylistCover,
  getPlaylistDescription,
  renderTrackRow,
  findTrackIndex,
  documentRef: document
});

mineController = createMineController({
  elements: {
    neteaseLoginBtn,
    neteaseLoginStatus,
    neteaseProfileName,
    neteaseAvatar,
    neteaseStickyName,
    neteaseStickyAvatar,
    musicSearch,
    musicSearchBackBtn,
    userProfilePanel,
    minePlaylistList,
    minePlaylistCount,
    playlistNameSearch,
    musicSearchPage,
    minePlaylistDetail,
    artistTopbar,
    artistProfilePanel,
    mineArtistDetail
  },
  documentRef: document,
  neteaseApi,
  getQueue: () => model?.queue || [],
  getActiveMinePlaylistId,
  getActiveNeteasePlaylist,
  setActiveNeteasePlaylist,
  renderPlaylistDetail,
  resetArtistState,
  renderPlaylistCards,
  getCoverUrl: getNeteaseCoverProxyUrl,
  prewarmVisibleCovers,
  prewarmPlaylistDetails: prewarmNeteasePlaylistDetails
});

const loginController = createLoginController({
  elements: {
    neteaseLoginBtn,
    neteaseLoginStatus,
    neteaseLoginMethodsPanel,
    neteaseQrImage,
    neteaseQrPanel,
    neteasePasswordLoginForm,
    neteasePasswordSubmitBtn,
    neteasePasswordLoginInputs
  },
  neteaseApi,
  loadNeteasePlaylists,
  refreshNeteaseStatus,
  setNeteaseProfile,
  setIntervalFn: window.setInterval.bind(window),
  clearIntervalFn: window.clearInterval.bind(window)
});
const {
  handleLoginButtonClick,
  handleLoginModeChange,
  syncPasswordLoginMode,
  submitPasswordLogin
} = loginController;

const collectController = createCollectController({
  elements: {
    collectModal,
    collectModalTitle,
    collectModalTrack,
    collectPlaylistList
  },
  documentRef: document,
  neteaseApi,
  getTrackFromRow,
  getPlaylists: getMinePlaylists,
  getCoverUrl: getNeteaseCoverProxyUrl,
  renderNotice: renderClaudioNotice,
  onCollected: async ({ data, playlist, playlistId, track }) => {
    applyNeteaseDbSnapshot(data);
    const activeMinePlaylistId = getActiveMinePlaylistId();
    if (activeMinePlaylistId) {
      await renderPlaylistDetail(activeMinePlaylistId);
    } else {
      renderMinePlaylist();
    }
    renderClaudioNotice(
      data.pendingSync
        ? `已先保存到本地，等网易云登录恢复后再同步到「${playlist?.title || "网易云歌单"}」。`
        : `已收藏到「${playlist?.title || "网易云歌单"}」。`,
      { key: `collect-${track.sourceId}-${playlistId}` }
    );
  }
});
const {
  closeCollectModal,
  handlePlaylistListClick,
  openCollectModal
} = collectController;

const musicSearchController = createSearchController({
  musicSearch,
  musicSearchResults,
  musicSearchPageBtn,
  musicSearchPage,
  musicSearchBackBtn,
  musicSearchPageTitle,
  musicSearchPageCount,
  musicSearchPageList,
  userProfilePanel,
  artistTopbar,
  artistProfilePanel,
  minePlaylistList,
  minePlaylistDetail,
  mineArtistDetail,
  playlistNameSearch,
  neteaseApi,
  isMineSearchOpen: () => mineStickyTop?.classList.contains("is-search-open"),
  renderMinePlaylist,
  setMineSearchOpen,
  renderTrackRow,
  renderSearchPreviewItems,
  getSearchPageTitle,
  getSearchPageCount,
  preloadNeteaseCoverSlice: (tracks, options) => preloadNeteaseCoverSlice(tracks, { ...options, api }),
  prewarmVisibleCovers,
  documentRef: document
});
const {
  getQuery: getMusicSearchQuery,
  getSongs: getMusicSearchSongs,
  loadMoreMusicSearchResults,
  maybeLoadMoreMusicSearchResults,
  openMusicSearchPageFromInput,
  renderMusicSearchPage,
  renderMusicSearchResults,
  searchNeteaseMusic
} = musicSearchController;

const recommendController = createRecommendController({
  radioRecommendPanel,
  radioRecommendKicker,
  radioRecommendTitle,
  historyRecommendBtn,
  radioRecommendList,
  dailyRecommendMeta,
  dailyRecommendCover,
  dailyRecommendMonth,
  dailyRecommendDay,
  neteaseApi,
  closeTrackMenus,
  getNeteaseCoverProxyUrl,
  getRecommendPanelState,
  renderTrackRow,
  prewarmVisibleCovers
});
const {
  getDailyRecommendSongs,
  getHistoryRecommendSongs,
  getRecommendPlaylist,
  getRecommendTrackListForPanel,
  loadDailyRecommendSongs,
  loadHistoryRecommendSongs,
  renderDailyRecommendCard,
  renderRadioRecommendPanel
} = recommendController;

function setTheme(theme) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  writeStorage("claudio-theme", nextTheme);
  window.dispatchEvent(new CustomEvent("claudio:themechange", { detail: { theme: nextTheme } }));
}

const northernBackgroundRuntimeController = createNorthernBackgroundRuntimeController({
  elements: {
    northernBackgroundOptions,
    northernBackgroundInput,
    northernBackgroundStatus,
    northernImagePreview
  },
  api,
  body: document.body,
  readStorage,
  writeStorage,
  setTheme
});
const {
  bindNorthernBackgroundEvents,
  loadNorthernBackground
} = northernBackgroundRuntimeController;

function setAppPage(pageName) {
  return setAppPageFromController(pageName);
}

function setAppPageWithoutSnapshot(pageName) {
  suppressNextPageSnapshot = true;
  return setAppPageFromController(pageName);
}

function getNavigationSnapshotKey(snapshot) {
  return JSON.stringify(snapshot || {});
}

function getCurrentNavigationSnapshot() {
  const page = document.body.dataset.page || "radio";
  const mineView = document.body.dataset.mineView || "list";
  if (page === "mine") {
    const snapshot = { page: "mine", mineView };
    if (mineView === "detail") {
      snapshot.playlistId = getActiveMinePlaylistId();
    }
    if (mineView === "search") {
      snapshot.searchQuery = musicSearch?.value || "";
    }
    return snapshot;
  }
  if (page === "artist") {
    return {
      page: "artist",
      artistSource: getActiveArtistSource(),
      artistName: artistHeroName?.textContent || ""
    };
  }
  if (page === "album") {
    return {
      page: "album",
      albumId: getActiveAlbumId(),
      albumName: albumHeroTitle?.textContent || ""
    };
  }
  if (page === "player") {
    return {
      page: "player",
      playerReturnPage
    };
  }
  return { page };
}

function pushNavigationSnapshot(snapshot = getCurrentNavigationSnapshot()) {
  if (restoringNavigationSnapshot || !snapshot?.page) return;
  const lastSnapshot = navigationBackStack[navigationBackStack.length - 1];
  if (getNavigationSnapshotKey(lastSnapshot) === getNavigationSnapshotKey(snapshot)) return;
  navigationBackStack.push(snapshot);
  if (navigationBackStack.length > 32) {
    navigationBackStack = navigationBackStack.slice(-32);
  }
}

function recordNavigationBeforePageChange({ nextPage }) {
  if (restoringNavigationSnapshot) return;
  if (suppressNextPageSnapshot) {
    suppressNextPageSnapshot = false;
    return;
  }
  if (nextPage === "radio") {
    navigationBackStack = [];
    return;
  }
  pushNavigationSnapshot();
}

function popNavigationBackTarget() {
  return navigationBackStack.pop() || null;
}

async function restoreNavigationSnapshot(snapshot) {
  if (!snapshot?.page) return;
  restoringNavigationSnapshot = true;
  try {
    if (snapshot.page === "radio") {
      setAppPage("radio");
      return;
    }
    if (snapshot.page === "mine") {
      setAppPage("mine");
      if (snapshot.mineView === "detail" && snapshot.playlistId) {
        setPlaylistSearchOpen(false);
        await renderPlaylistDetail(snapshot.playlistId, { refresh: false });
        return;
      }
      if (snapshot.mineView === "search") {
        if (musicSearch) musicSearch.value = snapshot.searchQuery || "";
        renderMusicSearchPage();
        return;
      }
      showMineTopLevelPage();
      return;
    }
    if (snapshot.page === "artist" && (snapshot.artistSource || snapshot.artistName)) {
      await openArtistPage({ id: snapshot.artistSource, name: snapshot.artistName });
      return;
    }
    if (snapshot.page === "album" && snapshot.albumId) {
      await openAlbumPage({ id: snapshot.albumId, name: snapshot.albumName });
      return;
    }
    if (snapshot.page === "player") {
      playerReturnPage = snapshot.playerReturnPage || playerReturnPage || "radio";
      openPlayerPage();
      return;
    }
    setAppPage(snapshot.page);
  } finally {
    restoringNavigationSnapshot = false;
  }
}

function restorePreviousNavigationTarget() {
  const target = popNavigationBackTarget();
  if (!target) return false;
  restoreNavigationSnapshot(target).catch(() => {
    setAppPage("radio");
  });
  return true;
}

function showMineTopLevelPage({ suppressSnapshot = false } = {}) {
  clearActivePlaylist();
  resetAlbumState();
  setPlaylistSearchOpen(false);
  renderMinePlaylist();
  if (suppressSnapshot) {
    suppressNextPageSnapshot = true;
  }
  setAppPage("mine");
}

function showArtistBackTarget() {
  resetAlbumState();
  resetArtistState();
  if (musicSearch) {
    musicSearch.value = "";
    musicSearch.placeholder = "搜索音乐";
  }
  renderMinePlaylist();
}

function updateMineStickyState() {
  return updateMineStickyStateFromController();
}

function setMineSearchOpen(open) {
  return setMineSearchOpenFromController(open);
}

function toggleMineSearchOpen() {
  return toggleMineSearchOpenFromController();
}

function closeMineSearchIfEmpty() {
  return closeMineSearchIfEmptyFromController();
}

function getPlainArtistText(track = model?.track) {
  return getPlainArtistTextFromTrack(track);
}

function getPlayableDuration() {
  return getPlayableDurationFromState(audio.duration, model?.track?.duration);
}

function updateProgressUi(currentTime = audio.currentTime || 0, durationValue = getPlayableDuration()) {
  return updateProgressUiFromController(currentTime, durationValue);
}

function canSeekAudio() {
  return canSeekAudioFromController();
}

function tryApplyPendingSeek() {
  return tryApplyPendingSeekFromController();
}

function requestAudioSeek(targetTime, { user = false } = {}) {
  const safeTarget = Math.max(0, Number(targetTime || 0));
  setLyricClockOverride(safeTarget);
  const result = requestAudioSeekFromController(safeTarget, { user });
  if (model?.track?.id) renderLyric(model.track.id);
  return result;
}

function getPlaybackClockTime(fallbackTime = audio.currentTime || 0) {
  const lyricClockOverride = getLyricClockOverride();
  return Number.isFinite(lyricClockOverride) ? lyricClockOverride : Number(fallbackTime || 0);
}

function getAndroidMediaPosition() {
  const actualTime = Number(audio.currentTime || 0);
  if (Number.isFinite(actualTime) && actualTime > 0) return actualTime;
  const lyricClockOverride = getLyricClockOverride();
  return Number.isFinite(lyricClockOverride) && lyricClockOverride > 0 ? lyricClockOverride : 0;
}

function settleLyricClockOverride(currentTime = audio.currentTime || 0) {
  const lyricClockOverride = getLyricClockOverride();
  if (!Number.isFinite(lyricClockOverride)) return false;
  const actualTime = Math.max(0, Number(currentTime || 0));
  const hasSyncedToStart = lyricClockOverride <= 0 && actualTime < 1.5;
  const hasSyncedToSeek = lyricClockOverride > 0
    && (Math.abs(actualTime - lyricClockOverride) <= 0.75
      || (actualTime > lyricClockOverride && actualTime - lyricClockOverride <= 3));
  if (!hasSyncedToStart && !hasSyncedToSeek) return false;
  clearLyricClockOverride();
  return true;
}

function updateProgressFromPlaybackClock(fallbackTime = audio.currentTime || 0) {
  settleLyricClockOverride(fallbackTime);
  const currentTime = getPlaybackClockTime(fallbackTime);
  updateProgressUi(currentTime, getPlayableDuration());
  return currentTime;
}

function waitForAudioSeekResume(timeoutMs = 700) {
  if (!audio.seeking && audio.readyState >= 3) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const cleanup = () => {
      audio.removeEventListener("seeked", done);
      audio.removeEventListener("canplay", done);
    };
    const done = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    audio.addEventListener("seeked", done, { once: true });
    audio.addEventListener("canplay", done, { once: true });
    setTimeout(done, timeoutMs);
  });
}

async function resumePlaybackAfterSeekStart() {
  try {
    await playAudioWithDiagnostics(audio, {
      renderNotice: renderClaudioNotice,
      context: getAudioPlayContext()
    });
  } catch (error) {
    if (error?.name !== "AbortError") throw error;
    await waitForAudioSeekResume();
    await playAudioWithDiagnostics(audio, {
      renderNotice: renderClaudioNotice,
      context: getAudioPlayContext()
    });
  }
}

function syncPlayerProgress() {
  return syncPlayerProgressFromController();
}

function syncPlayerModeUi() {
  syncModeButtonView(playerModeBtn, playMode);
}

function syncPlayerDetail() {
  const track = model?.track;
  if (playerPageTitle) playerPageTitle.textContent = track?.title || "加载中";
  if (playerPageArtist) {
    playerPageArtist.innerHTML = track ? renderArtistLinks(track) : "正在连接 Claudio";
  }
  playerLikeBtn?.classList.toggle("is-liked", isTrackLiked(track));
  syncPlayerProgress();
  syncPlayerModeUi();
  syncPlayerQueue(model?.queue || []);
  syncPlayerLyrics();
  syncPlayUi();
}

function openPlayerPage() {
  const wasPlayerPage = document.body.dataset.page === "player";
  if (!wasPlayerPage) {
    playerReturnPage = document.body.dataset.page || playerReturnPage || "radio";
    suppressNextPageSnapshot = true;
  }
  resetPlayerLyricUserScroll();
  setPlayerQueueOpen(false);
  setAppPage("player");
  syncPlayerLyrics({ anchor: "start" });
}

async function openPlayerFromRow(row) {
  const track = getTrackFromRow(row);
  if (!track) return;
  if (!isSameTrack(track, model?.track)) {
    await playTrackFromRow(row);
  }
  openPlayerPage();
}

async function handleTrackRowAction(event, { allowRemove = false, allowPlayerOpen = true } = {}) {
  const action = getTrackActionFromEventTarget(event.target);
  if (action.type === "artist") {
    await openArtistPage({
      id: action.artistLink.dataset.artistId,
      name: action.artistLink.dataset.artistName || action.artistLink.textContent
    });
    return true;
  }
  if (allowPlayerOpen && action.type === "player-open") {
    await openPlayerFromRow(action.row);
    return true;
  }
  if (action.type === "more") {
    if (!action.menu) return true;
    const nextHidden = !action.menu.hidden;
    closeTrackMenus(action.menu);
    action.menu.hidden = nextHidden;
    return true;
  }
  if (action.type === "next") {
    setTrackAsNext(action.row);
    closeTrackMenus();
    return true;
  }
  if (action.type === "collect") {
    openCollectModal(action.row);
    closeTrackMenus();
    return true;
  }
  if (allowRemove && action.type === "remove") {
    closeTrackMenus();
    await removeTrackFromActivePlaylist(action.row);
    return true;
  }
  if (action.type === "play") {
    await playTrackFromRow(action.row);
    return true;
  }
  return false;
}

function getFilteredMineTracks() {
  const query = (musicSearch?.value || "").trim().toLowerCase();
  const queue = model?.queue || [];
  if (!query) return queue.map((track, index) => ({ track, index }));
  return queue
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => {
      const haystack = [track.title, track.artist, track.mood].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(query);
    });
}

function getMinePlaylists() {
  return mineController?.getMinePlaylists() || [];
}

function getNeteasePlaylists() {
  return mineController?.getNeteasePlaylists() || [];
}

function getLikedPlaylist() {
  return getNeteasePlaylists().find((playlist) =>
    playlist.source === "netease" &&
    (Number(playlist.displayOrder || 0) < 0 || /喜欢的音乐/.test(playlist.title || ""))
  );
}

function isTrackInPlaylist(track, playlist) {
  if (!track?.sourceId || !playlist?.tracks?.length) return false;
  return playlist.tracks.some((item) =>
    String(item.sourceId || "") === String(track.sourceId || "") || item.id === track.id
  );
}

function isTrackLiked(track) {
  if (!track) return false;
  if (track.liked === true) return true;
  return isTrackInPlaylist(track, getLikedPlaylist());
}

function setCurrentTrackLiked(liked) {
  if (model?.track) {
    model.track = { ...model.track, liked };
  }
  if (Array.isArray(model?.queue)) {
    model.queue = model.queue.map((track) =>
      track.sourceId && String(track.sourceId) === String(model?.track?.sourceId || "") ? { ...track, liked } : track
    );
  }
  likeBtn?.classList.toggle("is-liked", Boolean(liked));
  playerLikeBtn?.classList.toggle("is-liked", Boolean(liked));
  syncAndroidMediaSession();
}

function syncCurrentTrackLikeState() {
  if (!model?.track) return;
  setCurrentTrackLiked(isTrackLiked(model.track));
}
function getPlaylistCover(playlist) {
  return getPlaylistCoverFromView(playlist, getNeteaseCoverProxyUrl);
}

function getPlaylistCoverStyle(tracks = []) {
  return getPlaylistCoverStyleFromView(tracks, getNeteaseCoverProxyUrl);
}

function getFilteredMinePlaylists() {
  return mineController?.getFilteredMinePlaylists() || [];
}

async function refreshNeteasePlaylistsFromDb({ render = false } = {}) {
  const data = await loadNeteasePlaylists({ refresh: false, render, renderActiveDetail: false });
  return data?.playlists || [];
}

function applyNeteaseDbSnapshot(data = {}) {
  mineController?.applyNeteaseDbSnapshot(data);
  syncCurrentTrackLikeState();
}

function findTrackIndex(trackId) {
  return (model?.queue || []).findIndex((track) => track.id === trackId);
}

function getPlaylistDescription(playlist) {
  return getPlaylistDescriptionFromView(playlist);
}

function renderTrackRow(track, index, { queueIndex = findTrackIndex(track.id), actionLabel = "", allowRemove = false, actionButtons = null, showCover = true, lazyCover = true } = {}) {
  return renderTrackRowHtml(track, index, {
    queueIndex,
    currentTrackId: model?.track?.id || "",
    actionLabel,
    allowRemove,
    actionButtons,
    showCover,
    lazyCover
  });
}

async function loadNeteasePlaylistDetail(playlist, { refresh = false } = {}) {
  if (!playlist?.sourceId) return playlist;
  const cacheKey = `${playlist.sourceId}:${refresh ? "refresh" : "local"}`;
  if (!refresh && neteasePlaylistDetailPromises.has(cacheKey)) {
    return neteasePlaylistDetailPromises.get(cacheKey);
  }
  const loadPromise = neteaseApi.getPlaylist({
    id: playlist.sourceId,
    refresh,
    local: !refresh
  }).then((data) => {
    const nextPlaylist = data.playlist || playlist;
    mineController?.replaceNeteasePlaylist(playlist.id, nextPlaylist);
    syncCurrentTrackLikeState();
    return nextPlaylist;
  }).finally(() => {
    neteasePlaylistDetailPromises.delete(cacheKey);
  });
  if (!refresh) neteasePlaylistDetailPromises.set(cacheKey, loadPromise);
  return loadPromise;
}

function prewarmNeteasePlaylistDetails(playlists = []) {
  const candidates = playlists.filter((playlist) =>
    playlist?.source === "netease" &&
    playlist.sourceId &&
    (!Array.isArray(playlist.tracks) || playlist.tracks.length === 0)
  );
  let chain = Promise.resolve();
  candidates.forEach((playlist) => {
    chain = chain.then(() => loadNeteasePlaylistDetail(playlist, { refresh: false }).catch(() => null));
  });
  return chain;
}

function getVoiceSettings() {
  return voiceSettingsController.getVoiceSettings();
}

function restorePlaybackFromStorage() {
  if (!isAndroidRuntime()) return false;
  const payload = readStoredPlaybackPayload(readStorage);
  if (!payload) return false;
  const restored = buildNowPayloadFromPlaybackPayload(payload, model || {});
  if (!restored?.track?.id) return false;
  model = createLocalPlaybackModel(restored);
  const restoredPlayback = model.state?.playback || {};
  if (restoredPlayback.playlist?.source === "netease") {
    setActiveNeteasePlaylist(restoredPlayback.playlist);
  }
  renderNow(model, { restorePosition: true });
  syncPlayUi();
  startupPlaybackRestored = true;
  return true;
}

function refreshCurrentVoiceAndInsight() {
  saveVoiceSettings();
  refreshVoiceRuntime();
  autoDjPlayed.delete(currentTrackId);
  if (!djModeEnabled) return;
  if (!currentTrackId) return;
  clearInsightCache();
  chatLog.dataset.insightTrackId = "";
  renderInsightLoading();
  loadInsightForTrack(currentTrackId, { force: true });
}

function renderMinePlaylist() {
  return mineController?.renderMinePlaylist();
}

function setNeteaseProfile(profile = null) {
  return mineController?.setNeteaseProfile(profile);
}

async function refreshNeteaseStatus() {
  return mineController?.refreshNeteaseStatus();
}

async function loadNeteasePlaylists({ refresh = false, render = true, renderActiveDetail = true } = {}) {
  const data = await mineController?.loadNeteasePlaylists({ refresh, render, renderActiveDetail });
  syncCurrentTrackLikeState();
  return data;
}

function getTrackFromRow(row) {
  return getTrackFromElement(row, {
    queue: model?.queue || [],
    trackGroups: [
      getActiveArtistTracks(),
      getActiveAlbumTracks(),
      getMusicSearchSongs(),
      getRecommendTrackListForPanel(),
      getDailyRecommendSongs(),
      getHistoryRecommendSongs(),
      getMinePlaylists().find((candidate) => candidate.id === getActiveMinePlaylistId())?.tracks || [],
      getNeteasePlaylists().flatMap((playlist) => playlist.tracks || [])
    ]
  });
}

function closeTrackMenus(except = null) {
  document.querySelectorAll(".track-menu").forEach((menu) => {
    if (menu !== except) menu.hidden = true;
  });
}

function isSameTrack(a, b) {
  return isSameTrackFromState(a, b);
}

function getActiveQueueIndex(queue = model?.queue || []) {
  return getActiveQueueIndexFromState(queue, model?.track, activeQueueIndex);
}

function insertTrackAfterCurrent(track) {
  const queue = Array.isArray(model?.queue) ? model.queue.slice() : [];
  const result = insertTrackAfterCurrentInQueue(queue, track, Math.max(0, getActiveQueueIndex(queue)));
  if (result.insertIndex < 0) return -1;
  model = { ...(model || {}), queue: result.queue };
  activeQueueIndex = result.activeQueueIndex;
  return result.insertIndex;
}

function setTrackAsNext(row) {
  const track = getTrackFromRow(row);
  if (!track || !model?.queue) return;
  const index = insertTrackAfterCurrent(track);
  if (index < 0) return;
  renderQueue(model.queue, model.track?.id);
  renderQueueDock(model.queue, model.track?.id);
  renderGlobalQueueSheet(model.queue);
  persistPlaybackState({ immediate: true });
  warmUpcomingQueue(model?.queue || []);
}

async function removeTrackFromPlaybackQueue(index) {
  const queue = Array.isArray(model?.queue) ? model.queue.slice() : [];
  const currentIndex = getActiveQueueIndex(queue);
  const result = removeTrackAtIndex(queue, index, currentIndex);
  if (!result.removed) return false;
  model = { ...(model || {}), queue: result.queue };
  activeQueueIndex = result.activeQueueIndex;
  if (result.shouldPlayReplacement) {
    if (activeQueueIndex >= 0) {
      await playQueueTrackAt(activeQueueIndex);
      renderGlobalQueueSheet(model?.queue || []);
      return true;
    }
  }
  renderQueue(result.queue, model.track?.id);
  renderQueueDock(result.queue, model.track?.id);
  renderGlobalQueueSheet(result.queue);
  persistPlaybackState({ immediate: true });
  warmUpcomingQueue(model?.queue || []);
  return true;
}

async function removeTrackFromActivePlaylist(row) {
  const track = getTrackFromRow(row);
  const playlist = getActiveNeteasePlaylist();
  if (!track?.sourceId || !playlist?.sourceId) {
    renderClaudioNotice("这首歌暂时不能从歌单移除。", { key: "playlist-remove-unavailable" });
    return;
  }
  const isLikedPlaylist = Number(playlist.displayOrder || 0) < 0 || /喜欢的音乐/.test(playlist.title || "");
  const data = isLikedPlaylist
    ? await neteaseApi.setLike({ track, liked: false })
    : await neteaseApi.removePlaylistTrack({ playlistId: playlist.sourceId, sourceId: track.sourceId });
  applyNeteaseDbSnapshot(data);
  const activeNeteasePlaylist = getActiveNeteasePlaylist();
  if (model?.queue === playlist.tracks || activeNeteasePlaylist?.id === playlist.id) {
    model = {
      ...(model || {}),
      queue: (data.playlist?.tracks || data.likedPlaylist?.tracks || activeNeteasePlaylist?.tracks || model?.queue || []).slice()
    };
  }
  const activeMinePlaylistId = getActiveMinePlaylistId();
  if (activeMinePlaylistId) {
    await renderPlaylistDetail(activeMinePlaylistId);
  } else {
    renderMinePlaylist();
  }
  renderClaudioNotice(
    data.pendingSync
      ? "已先从本地歌单移除，等网易云登录恢复后再同步。"
      : "已从歌单移除。",
    { key: `playlist-remove-${track.sourceId}-${playlist.sourceId}` }
  );
}

async function playTrackFromRow(row) {
  const track = getTrackFromRow(row);
  if (!track) return;
  if (track.source === "netease") {
    let queueIndex = null;
    let shouldUsePlaylistLoopMode = false;
    const activeArtistTracks = getActiveArtistTracks();
    if (activeArtistTracks.includes(track)) {
      const activeNeteasePlaylist = {
        id: `netease-artist-${getActiveArtistSource() || track.artistId || track.artist || "songs"}`,
        source: "netease",
        sourceId: "",
        title: track.artist ? `${track.artist} 的热门歌曲` : "歌手热门歌曲",
        subtitle: "网易云歌手",
        description: "从网易云歌手主页临时生成的播放队列。",
        cover: track.cover || "",
        tracks: activeArtistTracks
      };
      setActiveNeteasePlaylist(activeNeteasePlaylist);
      queueIndex = setCurrentPlaybackQueueFromPlaylist(activeNeteasePlaylist, track);
    }
    const searchSongs = getMusicSearchSongs();
    const searchQuery = getMusicSearchQuery();
    if (searchSongs.includes(track)) {
      const activeNeteasePlaylist = {
        id: `netease-search-${searchQuery || "songs"}`,
        source: "netease",
        sourceId: "",
        title: searchQuery ? `搜索：${searchQuery}` : "网易云搜索结果",
        subtitle: "网易云搜索",
        description: "从网易云搜索结果临时生成的播放队列。",
        cover: track.cover || "",
        tracks: searchSongs
      };
      setActiveNeteasePlaylist(activeNeteasePlaylist);
      queueIndex = setCurrentPlaybackQueueFromPlaylist(activeNeteasePlaylist, track);
    }
    if (getHistoryRecommendSongs().includes(track)) {
      const activeNeteasePlaylist = getRecommendPlaylist("history");
      setActiveNeteasePlaylist(activeNeteasePlaylist);
      queueIndex = setCurrentPlaybackQueueFromPlaylist(activeNeteasePlaylist, track);
    }
    if (getDailyRecommendSongs().includes(track)) {
      const activeNeteasePlaylist = getRecommendPlaylist("daily");
      setActiveNeteasePlaylist(activeNeteasePlaylist);
      queueIndex = setCurrentPlaybackQueueFromPlaylist(activeNeteasePlaylist, track);
    }
    const activeMinePlaylistId = getActiveMinePlaylistId();
    const activePlaylist = getActiveNeteasePlaylist();
    if (
      activeMinePlaylistId &&
      String(activePlaylist?.id || "") === String(activeMinePlaylistId) &&
      activePlaylist?.tracks?.some((item) => isSameTrack(item, track))
    ) {
      shouldUsePlaylistLoopMode = true;
      if (queueIndex == null) {
        queueIndex = setCurrentPlaybackQueueFromPlaylist(activePlaylist, track);
      }
    }
    if (shouldUsePlaylistLoopMode) {
      await setPlayMode(getPlaylistTrackPlayMode(playMode), { applyEffects: false });
    }
    await playNeteaseTrack(track, { queueIndex, queueOverride: getActiveNeteasePlaylist()?.tracks || null });
    return;
  }
  if (!model) return;
  const index = Number(row.dataset.mineTrackIndex);
  if (!Number.isInteger(index) || index < 0) return;
  await playQueueTrackAt(index);
}

async function playNeteaseTrack(track, { restorePosition = false, refreshUrl = false, autoStart = true, queueIndex = null, queueOverride = null } = {}) {
  if (!track?.sourceId) return;
  if (autoStart) markPlaybackIntent();
  let src = "";
  try {
    if (isAndroidRuntime()) {
      console.info("[ClaudeFM] Android playNeteaseTrack resolving", { sourceId: track.sourceId, title: track.title, hasSrc: Boolean(track.src), refreshUrl });
      const directSrc = refreshUrl || !track.src
        ? (await neteaseApi.getSongUrl({ songId: track.sourceId, refresh: refreshUrl })).src
        : track.src;
      src = getNeteaseAudioProxyUrl({ ...track, src: normalizeNeteaseDirectMediaUrl(directSrc) });
      console.info("[ClaudeFM] Android playNeteaseTrack resolved", { sourceId: track.sourceId, hasProxySrc: Boolean(src), src: src ? src.slice(0, 80) : "" });
    } else {
      src = refreshUrl
        ? getNeteaseAudioProxyUrl({
            ...track,
            src: (await neteaseApi.getSongUrl({ songId: track.sourceId, refresh: true })).src
          })
        : getNeteaseAudioProxyUrl({ ...track, src: "" });
    }
  } catch (error) {
    if (isNeteaseFreeTrialOnlyError(error)) {
      neteaseFreeTrialOnlySongIds.add(String(track.sourceId));
      renderClaudioNotice(NETEASE_FREE_TRIAL_NOTICE, { key: "netease-url-error" });
      syncPlayUi();
      throw error;
    }
    throw error;
  }
  if (!src) {
    renderClaudioNotice("这首歌暂时拿不到可播放链接。", { key: "netease-url-error" });
    return;
  }
  neteaseAudioRetryKey = "";
  const baseModel = createLocalPlaybackModel(model);
  const playbackPlaylist = getActivePlaybackPlaylist();
  const activeNeteasePlaylist = getActiveNeteasePlaylist();
  const activePlaylistTracks = activeNeteasePlaylist?.tracks?.length ? activeNeteasePlaylist.tracks : [];
  let currentQueue = Array.isArray(queueOverride) && queueOverride.length
    ? queueOverride.slice()
    : (Array.isArray(baseModel.queue) && baseModel.queue.length ? baseModel.queue.slice() : []);
  if (!currentQueue.length) {
    currentQueue = activePlaylistTracks.some((item) => isSameTrack(item, track)) ? activePlaylistTracks.slice() : [track];
  }
  if (!currentQueue.some((item) => isSameTrack(item, track))) {
    currentQueue = [track, ...currentQueue];
  }
  const resolvedQueueIndex = Number.isInteger(queueIndex)
    ? queueIndex
    : currentQueue.findIndex((item) => isSameTrack(item, track));
  activeQueueIndex = resolvedQueueIndex >= 0 ? resolvedQueueIndex : 0;
  model = {
    ...baseModel,
    track: { ...track, src },
    queue: currentQueue,
    state: {
      ...(baseModel.state || {}),
      playback: {
        ...(baseModel.state?.playback || {}),
        source: "netease",
        trackId: track.id || "",
        sourceTrackId: track.sourceId || "",
        playlistId: playbackPlaylist?.id || "",
        playlistSourceId: playbackPlaylist?.sourceId || "",
        playlist: playbackPlaylist
      }
    },
    djLine: `现在播放网易云音乐：${track.title} / ${track.artist}`
  };
  renderNow(model, { restorePosition });
  if (autoStart) {
    userStartedPlayback = true;
    await playAudioWithDiagnostics(audio, {
      renderNotice: renderClaudioNotice,
      context: getAudioPlayContext(model.track)
    });
  }
  syncPlayUi();
  warmUpcomingQueue(model?.queue || []);
  persistPlaybackState({ immediate: true });
  if (autoStart) loadInsightForTrack(track.id);
}

function setCurrentPlaybackQueueFromPlaylist(playlist, track) {
  const result = buildPlaylistPlaybackState(playlist, track, model);
  if (!result) return null;
  setActiveNeteasePlaylist(playlist);
  model = {
    ...(model || {}),
    ...result.modelPatch
  };
  activeQueueIndex = result.index;
  return result.index;
}

async function playQueueTrackAt(index) {
  const queue = Array.isArray(model?.queue) ? model.queue.slice() : [];
  const track = queue[index];
  if (!track) return;
  markPlaybackIntent();
  activeQueueIndex = index;
  if (track.source === "netease") {
    await playNeteaseTrack(track, { queueIndex: index });
    return;
  }
  model = {
    ...(model || {}),
    track,
    queue,
    state: {
      ...(model?.state || {}),
      currentIndex: index,
      playback: {
        ...(model?.state?.playback || {}),
        source: track.source || "local",
        trackId: track.id || "",
        sourceTrackId: track.sourceId || ""
      }
    },
    djLine: `现在播放：${track.title} / ${track.artist || "未知歌手"}`
  };
  renderNow(model);
  setQueueOpen(false);
  userStartedPlayback = true;
  await playAudioWithDiagnostics(audio, {
    renderNotice: renderClaudioNotice,
    context: getAudioPlayContext(model.track)
  });
  syncPlayUi();
  loadInsightForTrack(model.track?.id);
  warmUpcomingQueue(model?.queue || []);
  persistPlaybackState({ immediate: true });
}
function buildEqualizer() {
  return buildEqualizerFromController();
}

function setEqualizerVisible(visible) {
  return setEqualizerVisibleFromController(visible);
}

function setEqualizerHeights(height = 0) {
  return setEqualizerHeightsFromController(height);
}

function stopEqualizer({ hide = false } = {}) {
  return stopEqualizerFromController({ hide });
}

function markEqualizerUnavailable() {
  return markEqualizerUnavailableFromController();
}

async function initAudioAnalyser() {
  return initAudioAnalyserFromController();
}

function renderEqualizerFrame(token) {
  return renderEqualizerFrameFromController(token);
}

async function startEqualizer() {
  return startEqualizerFromController();
}

function getCurrentIndex(queue = model?.queue || []) {
  return getCurrentIndexFromState(queue, model?.track, activeQueueIndex, model?.state);
}

function getNextIndex(queue = model?.queue || []) {
  return getNextIndexFromState(queue, model?.track, activeQueueIndex, model?.state);
}

function getSequentialNextIndex(queue = model?.queue || []) {
  return getSequentialNextIndexFromState(queue, model?.track, activeQueueIndex, model?.state);
}

function getNextPlaybackIndex(queue = model?.queue || []) {
  return getNextPlaybackIndexFromState(queue, model?.track, activeQueueIndex, playMode, model?.state);
}

function syncPlayModeUi() {
  syncModeButtonView(playModeBtn, playMode);
  syncPlayerModeUi();
}

function setPlayMode(modeId, { applyEffects = true } = {}) {
  playMode = getValidatedPlayMode(modeId, playMode);
  writeStorage("claudio-play-mode", playMode);
  syncPlayModeUi();
  renderQueueDock(model?.queue || [], model?.track?.id);
  if (!applyEffects) return Promise.resolve();
  return applyPlayModeEffects();
}

function shuffleTracks(items = []) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function refreshQueueViews() {
  renderQueue(model?.queue || [], model?.track?.id);
  renderQueueDock(model?.queue || [], model?.track?.id);
  renderGlobalQueueSheet(model?.queue || []);
  syncPlayerQueue(model?.queue || []);
}

function shufflePlaybackQueue() {
  const queue = Array.isArray(model?.queue) ? model.queue.slice() : [];
  if (queue.length <= 2) return;
  const currentIndex = getCurrentIndex(queue);
  const currentTrack = queue[currentIndex] || model?.track || queue[0];
  const rest = queue.filter((track, index) => index !== currentIndex);
  model = { ...(model || {}), queue: [currentTrack, ...shuffleTracks(rest)] };
  activeQueueIndex = 0;
  refreshQueueViews();
  persistPlaybackState({ immediate: true });
  warmUpcomingQueue(model?.queue || []);
}

async function loadHeartbeatQueue() {
  const track = model?.track;
  if (!track?.sourceId) {
    renderClaudioNotice("心动模式需要先播放一首网易云歌曲。", { key: "heartbeat-needs-netease" });
    return false;
  }
  const playlist = getActivePlaybackPlaylist();
  try {
    const data = await neteaseApi.getHeartbeat({ songId: track.sourceId, playlistId: playlist?.sourceId });
    const songs = Array.isArray(data.songs) ? data.songs.filter(Boolean) : [];
    if (!songs.length) throw new Error("empty heartbeat songs");
    const currentTrack = { ...track };
    const nextQueue = [currentTrack, ...songs.filter((item) => !isSameTrack(item, currentTrack))];
    model = {
      ...(model || {}),
      queue: nextQueue,
      state: {
        ...(model?.state || {}),
        playback: {
          ...(model?.state?.playback || {}),
          playlistId: `netease-heartbeat-${track.sourceId}`,
          playlistSourceId: playlist?.sourceId || "",
          playlist: {
            id: `netease-heartbeat-${track.sourceId}`,
            source: "netease",
            sourceId: playlist?.sourceId || "",
            title: "心动模式",
            subtitle: "网易云音乐",
            description: `基于 ${track.title} 生成的心动队列。`,
            cover: track.cover || songs[0]?.cover || "",
            trackCount: nextQueue.length
          }
        }
      }
    };
    activeQueueIndex = 0;
    refreshQueueViews();
    persistPlaybackState({ immediate: true });
    warmUpcomingQueue(model?.queue || []);
    return true;
  } catch {
    renderClaudioNotice("心动模式暂时获取失败，已保留当前播放队列。", { key: "heartbeat-error" });
    return false;
  }
}

async function applyPlayModeEffects() {
  if (playMode === "random") {
    shufflePlaybackQueue();
  } else if (playMode === "heartbeat") {
    await loadHeartbeatQueue();
  }
}

async function cyclePlayMode() {
  await setPlayMode(cyclePlayModeId(playMode));
}

function setProgress(percent) {
  return setProgressFromController(percent);
}

function renderInsightLoading() {
  clearWordHighlight();
  invalidateVoiceWarmup();
  chatLog.querySelectorAll(".insight-message").forEach((item) => item.remove());
  chatLog.dataset.insightTrackId = "";
  chatLog.dataset.insightEnglish = "[]";
  chatLog.dataset.insightWordCount = "0";
  chatLog.dataset.insightWordStarts = "[]";
  chatLog.dataset.insightWordCounts = "[]";
}

function autoSpeakInsight(trackId) {
  voiceController.autoSpeakInsight(trackId, () => currentTrackId);
}

function syncPlayUi() {
  const result = syncPlayUiFromController();
  syncAndroidMediaSession();
  return result;
}

function getAudioPlayContext(track = model?.track) {
  return {
    sourceId: track?.sourceId || "",
    title: track?.title || "",
    src: track?.src || audio?.currentSrc || audio?.src || ""
  };
}

function setDjMode(enabled, { requestInsight = false } = {}) {
  djModeEnabled = Boolean(enabled);
  writeStorage("claudio-dj-mode", djModeEnabled ? "1" : "0");
  document.body.classList.toggle("is-dj-mode", djModeEnabled);
  if (fmBtn) {
    fmBtn.classList.toggle("is-active", djModeEnabled);
    fmBtn.setAttribute("aria-pressed", String(djModeEnabled));
    fmBtn.setAttribute("title", djModeEnabled ? "关闭 DJ 模式" : "开启 DJ 模式");
  }
  if (!djModeEnabled) {
    invalidateInsightRun();
    clearClaudioNotice("insight-error");
    return;
  }
  if (requestInsight && currentTrackId) {
    renderInsightLoading();
    loadInsightForTrack(currentTrackId);
  }
}

function shouldShowTrackMood(track) {
  const mood = String(track?.mood || "").trim();
  return mood && !/网易云/.test(mood);
}

function shouldRestoreTrackPosition(track, state) {
  const playback = state?.playback;
  if (!playback || !track?.id) return false;
  return playback.trackId === track.id || (track.sourceId && playback.sourceTrackId === track.sourceId);
}

function getRestoredTrackPosition(track, state, restorePosition) {
  if (!restorePosition || !shouldRestoreTrackPosition(track, state)) return 0;
  return Number(state.position || state.playback?.position || 0);
}

function renderWeather(weather = {}) {
  const tempC = weather.tempC;
  stageWeatherTemp.textContent = `${tempC === undefined || tempC === null || tempC === "" ? "--" : tempC}°`;
  renderWeatherIcon(weatherIcon, getWeatherIconType(weather.summary));
}

function renderNow(data, { restorePosition = false } = {}) {
  model = data;
  const { track, state, weather, queue, integrations } = data;
  if (track.source === "netease" && queue?.length) {
    setActiveNeteasePlaylist({
      ...(state.playback?.playlist || {}),
      source: "netease",
      tracks: queue
    });
  }

  trackTitle.textContent = track.title;
  const moodText = shouldShowTrackMood(track) ? `<span>/ ${escapeHtml(track.mood)}</span>` : "";
  trackArtist.innerHTML = `
    <span class="now-artist-link">${renderArtistLinks(track)}</span>
    ${moodText}
  `;
  if (trackCover) {
    trackCover.style.backgroundImage = getTrackCoverBackground(track, getNeteaseCoverProxyUrl, "player");
  }
  djLine.textContent = data.djLine;
  renderWeather(weather);
  if (volume) volume.value = state.volume;
  audio.volume = state.volume;
  audio.playbackRate = 1;

  if (currentTrackId !== track.id) {
    stopSpeech();
    stopEqualizer({ hide: true });
    currentTrackId = track.id;
    resetPendingSeek({ includeUser: true });
    audio.src = track.src;
    progress.value = "0";
    setProgress(0);
    const restoredPosition = getRestoredTrackPosition(track, state, restorePosition);
    setLyricClockOverride(restoredPosition);
    updateProgressUi(restoredPosition, getPlayableDuration());
    if (restoredPosition > 0) requestAudioSeek(restoredPosition);
  } else if (track.src && audio.src !== new URL(track.src, window.location.href).href) {
    stopEqualizer({ hide: true });
    resetPendingSeek();
    audio.src = track.src;
    const restoredPosition = getRestoredTrackPosition(track, state, restorePosition);
    setLyricClockOverride(restoredPosition);
    updateProgressUi(restoredPosition, getPlayableDuration());
    if (restoredPosition > 0) requestAudioSeek(restoredPosition);
  }

  renderIntegrations(integrations);
  if (djModeEnabled && data.insight) {
    renderInsight(data.insight);
    if (userStartedPlayback) {
      autoSpeakInsight(track.id);
    }
  } else if (djModeEnabled) {
    renderInsightLoading();
  } else {
    renderInsightLoading();
    clearClaudioNotice("insight-error");
  }
  renderQueue(queue, track.id);
  renderQueueDock(queue, track.id);
  likeBtn?.classList.toggle("is-liked", isTrackLiked(track));
  syncPlayModeUi();
  if (document.body.dataset.page === "artist" && getActiveArtistSource()) {
    renderArtistContent();
  } else {
    renderMinePlaylist();
  }
  loadLyricsForTrack(track);
  renderLyric(track.id);
  syncPlayerDetail();
  syncPlayUi();
}

async function refreshWeather() {
  await weatherLocationController.requestSoon();
  const data = await api("/api/weather", { timeoutMs: 12000 });
  const weather = data?.weather || data;
  if (!weather || typeof weather !== "object") return;
  if (model) {
    model = {
      ...model,
      weather: {
        ...(model.weather || {}),
        ...weather
      }
    };
  }
  renderWeather(weather);
}

function refreshWeatherUntilReady(attempt = 0) {
  refreshWeather().catch(() => {
    if (attempt >= 6) return;
    const delay = Math.min(10000, 1800 * (attempt + 1));
    window.setTimeout(() => refreshWeatherUntilReady(attempt + 1), delay);
  });
}

async function refreshNow({ autoPlay = false, allowPause = true } = {}) {
  const requestPlaybackIntentVersion = playbackIntentVersion;
  try {
    await weatherLocationController.requestSoon();
    const data = await api(`/api/now${autoPlay ? "" : "?insight=0"}`);
    if (!autoPlay && requestPlaybackIntentVersion !== playbackIntentVersion) return;
    if (!autoPlay && !allowPause && userStartedPlayback) return;
    renderNow(data, { restorePosition: true });
    if (!autoPlay && allowPause) {
      userStartedPlayback = false;
      audio.pause();
      syncPlayUi();
      await saveState({ isPlaying: false }).catch(() => {});
      persistPlaybackState({ immediate: true });
    }
    if (data.track?.id && data.insight) {
      setCachedInsight(data.track.id, {
        ok: true,
        trackId: data.track.id,
        insight: data.insight,
        insightError: data.insightError,
        insightPending: false
      });
    }
    if (autoPlay) {
      userStartedPlayback = true;
      await playAudioWithDiagnostics(audio, {
        renderNotice: renderClaudioNotice,
        context: getAudioPlayContext(data.track)
      });
      syncPlayUi();
      loadInsightForTrack(data.track?.id);
      warmUpcomingQueue(model?.queue || []);
    }
  } catch (error) {
    djLine.textContent = `Claudio 暂时没有回应：${error.message}`;
  }
}

function speakInsightFrom(start = 0, { auto = false } = {}) {
  speakInsightFromController(start, { auto, currentTrackId });
}

async function resumeCurrentPlayback({ restorePosition = !userStartedPlayback } = {}) {
  if (model?.track?.source === "netease" && (!model.track.src || !audio.currentSrc)) {
    await playNeteaseTrack(model.track, { restorePosition });
    await saveState({ isPlaying: true });
    return;
  }
  userStartedPlayback = true;
  await playAudioWithDiagnostics(audio, {
    renderNotice: renderClaudioNotice,
    context: getAudioPlayContext(model.track)
  });
  await saveState({ isPlaying: true });
  if (!hasRenderedInsightForTrack(currentTrackId)) {
    loadInsightForTrack(currentTrackId);
  }
  warmUpcomingQueue(model?.queue || []);
  syncPlayUi();
}

async function toggleCurrentPlayback() {
  if (audio.paused) {
    await resumeCurrentPlayback();
  } else {
    await pauseCurrentPlayback();
  }
}

async function pauseCurrentPlayback() {
  audio.pause();
  await saveState({ isPlaying: false });
  syncPlayUi();
}

playBtn.addEventListener("click", () => {
  toggleCurrentPlayback().catch(console.error);
});

nextBtn.addEventListener("click", async () => {
  const nextIndex = getNextPlaybackIndex();
  if (nextIndex < 0) return;
  await playQueueTrackAt(nextIndex);
});

playModeBtn?.addEventListener("click", () => {
  cyclePlayMode().catch(() => {});
});

prevBtn.addEventListener("click", async () => {
  const queue = model?.queue || [];
  const previousIndex = queue.length ? (getCurrentIndex() - 1 + queue.length) % queue.length : -1;
  if (previousIndex < 0) return;
  await playQueueTrackAt(previousIndex);
});

likeBtn.addEventListener("click", async () => {
  const track = model?.track;
  const nextLiked = !likeBtn.classList.contains("is-liked");
  setCurrentTrackLiked(nextLiked);
  if (track?.source === "netease" && track.sourceId) {
    try {
      const data = await neteaseApi.setLike({ track, liked: nextLiked });
      setCurrentTrackLiked(Boolean(data.liked));
      applyNeteaseDbSnapshot(data);
      const activeMinePlaylistId = getActiveMinePlaylistId();
      if (activeMinePlaylistId) {
        await renderPlaylistDetail(activeMinePlaylistId);
      } else {
        renderMinePlaylist();
      }
    } catch {
      setCurrentTrackLiked(!nextLiked);
      renderClaudioNotice("喜欢状态暂时没有同步到网易云。", { key: "like-error" });
    }
  }
});

fmBtn?.addEventListener("click", () => {
  const nextEnabled = !djModeEnabled;
  setDjMode(nextEnabled, { requestInsight: nextEnabled });
});

speakDjBtn?.addEventListener("click", speakDjLine);

trackCover?.addEventListener("click", openPlayerPage);
trackTitle?.addEventListener("click", openPlayerPage);
playerBackBtn?.addEventListener("click", () => {
  setAppPageWithoutSnapshot(playerReturnPage === "player" ? "radio" : playerReturnPage);
});
playerPlayBtn?.addEventListener("click", () => {
  toggleCurrentPlayback().catch(console.error);
});
playerPrevBtn?.addEventListener("click", () => prevBtn?.click());
playerNextBtn?.addEventListener("click", () => nextBtn?.click());
playerModeBtn?.addEventListener("click", () => {
  cyclePlayMode().catch(() => {});
});
playerLikeBtn?.addEventListener("click", () => likeBtn?.click());
playerQueueBtn?.addEventListener("click", () => {
  setPlayerQueueOpen(playerQueuePanel?.hidden !== false);
});
playerProgress?.addEventListener("input", () => {
  const durationValue = getPlayableDuration();
  const percent = Number(playerProgress.value) / 10;
  if (progress) progress.value = playerProgress.value;
  if (durationValue) {
    requestAudioSeek((percent / 100) * durationValue, { user: true });
  }
  persistPlaybackState();
});
playerQueueList?.addEventListener("click", async (event) => {
  const modeButton = event.target.closest("[data-player-queue-mode]");
  if (modeButton) {
    event.stopPropagation();
    await cyclePlayMode();
    syncPlayerQueue(model?.queue || []);
    return;
  }

  const removeButton = event.target.closest("[data-player-remove-index]");
  if (removeButton && model?.queue) {
    const removed = await removeTrackFromPlaybackQueue(Number(removeButton.dataset.playerRemoveIndex));
    syncPlayerQueue(model.queue);
    if (removed) window.requestAnimationFrame(() => scrollCurrentQueueItem(playerQueueList));
    return;
  }
  const nextButton = event.target.closest("[data-player-next-index]");
  if (nextButton && model?.queue) {
    const track = model.queue[Number(nextButton.dataset.playerNextIndex)];
    if (track) {
      setTrackAsNext({ dataset: {}, __track: track });
      syncPlayerQueue(model.queue);
      window.requestAnimationFrame(() => scrollCurrentQueueItem(playerQueueList));
    }
    return;
  }
  const playButton = event.target.closest("[data-player-play-index]");
  if (!playButton) return;
  await playQueueTrackAt(Number(playButton.dataset.playerPlayIndex));
});
queueSheetList?.addEventListener("click", async (event) => {
  event.stopPropagation();
  const modeButton = event.target.closest("[data-queue-mode]");
  if (modeButton) {
    event.stopPropagation();
    await cyclePlayMode();
    renderGlobalQueueSheet(model?.queue || []);
    return;
  }

  const removeButton = event.target.closest("[data-sheet-remove-index]");
  if (removeButton && model?.queue) {
    const removed = await removeTrackFromPlaybackQueue(Number(removeButton.dataset.sheetRemoveIndex));
    renderGlobalQueueSheet(model.queue);
    if (removed) window.requestAnimationFrame(() => scrollCurrentQueueItem(queueSheetList));
    return;
  }
  const nextButton = event.target.closest("[data-sheet-next-index]");
  if (nextButton && model?.queue) {
    const track = model.queue[Number(nextButton.dataset.sheetNextIndex)];
    if (track) {
      setTrackAsNext({ dataset: {}, __track: track });
      renderGlobalQueueSheet(model.queue);
      window.requestAnimationFrame(() => scrollCurrentQueueItem(queueSheetList));
    }
    return;
  }

  const playButton = event.target.closest("[data-sheet-play-index]");
  if (!playButton) return;
  await playQueueTrackAt(Number(playButton.dataset.sheetPlayIndex));
  renderGlobalQueueSheet(model?.queue || []);
  window.requestAnimationFrame(() => scrollCurrentQueueItem(queueSheetList));
});
queueSheetMode?.addEventListener("click", async (event) => {
  event.stopPropagation();
  const modeButton = event.target.closest("[data-queue-mode]");
  if (!modeButton) return;
  event.stopPropagation();
  await cyclePlayMode();
  renderGlobalQueueSheet(model?.queue || []);
});
queueSheet?.addEventListener("click", (event) => {
  event.stopPropagation();
});
playerLyrics?.addEventListener("scroll", handlePlayerLyricsScroll, { passive: true });
["wheel", "touchstart", "pointerdown"].forEach((eventName) => {
  playerLyrics?.addEventListener(eventName, handlePlayerLyricsPointerInteraction, { passive: true });
});
playerLyrics?.addEventListener("click", async (event) => {
  const lyricItem = event.target.closest("[data-player-lyric-index]");
  const button = event.target.closest("[data-player-lyric-seek-index]");
  const wasLyricSeekSelected = Boolean(
    button && lyricItem?.classList?.contains("is-preview")
  );
  if (lyricItem) {
    previewPlayerLyricIndex(Number(lyricItem.dataset.playerLyricIndex));
  }
  if (button && !wasLyricSeekSelected) return;
  if (!button) return;
  const index = Number(button.dataset.playerLyricSeekIndex);
  const line = getPlayerLyricLine(index);
  if (!line || !Number.isFinite(Number(line.time))) return;
  const targetTime = Math.max(0, Number(line.time));
  const shouldResumePlayback = audio.paused;
  resetPlayerLyricUserScroll();
  if (shouldResumePlayback) {
    if (model?.track?.source === "netease" && (!model.track.src || !audio.currentSrc)) {
      requestAudioSeek(targetTime, { user: true });
      syncPlayerProgress();
      if (model?.track?.id) renderLyric(model.track.id);
      await playNeteaseTrack(model.track, { restorePosition: false });
      await saveState({ isPlaying: true });
      return;
    }
    userStartedPlayback = true;
    const resumePromise = resumePlaybackAfterSeekStart();
    requestAudioSeek(targetTime, { user: true });
    syncPlayerProgress();
    if (model?.track?.id) renderLyric(model.track.id);
    await resumePromise;
    await saveState({ isPlaying: true });
    if (!hasRenderedInsightForTrack(currentTrackId)) {
      loadInsightForTrack(currentTrackId);
    }
    warmUpcomingQueue(model?.queue || []);
    syncPlayUi();
  } else {
    requestAudioSeek(targetTime, { user: true });
    syncPlayerProgress();
    if (model?.track?.id) renderLyric(model.track.id);
    persistPlaybackState();
  }
});
playerLyrics?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const button = event.target.closest("[data-player-lyric-seek-index]");
  if (!button) return;
  event.preventDefault();
  button.click();
});
playerPageArtist?.addEventListener("click", (event) => {
  const artistLink = event.target.closest(".artist-link");
  if (!artistLink) return;
  openArtistPage({
    id: artistLink.dataset.artistId,
    name: artistLink.dataset.artistName || artistLink.textContent
  }).catch(() => {
    renderClaudioNotice("歌手主页暂时加载失败，请稍后再试。", { key: "artist-error" });
  });
});

trackArtist?.addEventListener("click", (event) => {
  const artistLink = event.target.closest(".artist-link");
  if (!artistLink) return;
  openArtistPage({
    id: artistLink.dataset.artistId,
    name: artistLink.dataset.artistName || artistLink.textContent
  }).catch(() => {
    renderClaudioNotice("歌手主页暂时加载失败，请稍后再试。", { key: "artist-error" });
  });
});

bindNorthernBackgroundEvents();
bindNavigationShellEvents();
bindPlaybackControlSurfaceEvents();
voicePresetSelect?.addEventListener("change", saveVoiceSettings);
voicePresetSelect?.addEventListener("change", refreshCurrentVoiceAndInsight);
voiceCustomSelect?.addEventListener("change", () => {
  renderCustomVoiceSelect(voiceCustomSelect.value);
  saveVoiceSettings();
  refreshCurrentVoiceAndInsight();
});
voiceCustomSaveBtn?.addEventListener("click", saveCurrentCustomVoice);
voiceCustomDeleteBtn?.addEventListener("click", deleteCurrentCustomVoice);
voiceSettingsSaveBtn?.addEventListener("click", refreshCurrentVoiceAndInsight);
bindApiSettingsEvents();
neteaseLoginBtn?.addEventListener("click", () => {
  handleLoginButtonClick().catch(() => {
    if (neteaseLoginStatus) neteaseLoginStatus.textContent = "网易云登录启动失败，请稍后重试。";
  });
});
neteasePasswordLoginForm?.addEventListener("submit", (event) => {
  submitPasswordLogin(event).catch(() => {
    if (neteaseLoginStatus) neteaseLoginStatus.textContent = "网易云账号登录失败，请稍后重试。";
  });
});
neteasePasswordLoginInputs.mode?.addEventListener("change", () => {
  handleLoginModeChange().catch(() => {
    if (neteaseLoginStatus) neteaseLoginStatus.textContent = "网易云登录方式切换失败，请稍后重试。";
  });
});

musicSearchResults?.addEventListener("click", async (event) => {
  const item = event.target.closest("[data-search-source-id]");
  if (!item) return;
  if (event.target.closest("[data-search-collect]")) {
    openCollectModal(item);
    return;
  }
  if (event.target.closest("[data-search-next]")) {
    setTrackAsNext(item);
    return;
  }
  await playTrackFromRow(item);
});

musicSearchPageBtn?.addEventListener("click", () => {
  toggleMineSearchOpen();
});

mineSearchSubmit?.addEventListener("click", async () => {
  if (!(musicSearch?.value || "").trim()) {
    closeMineSearchIfEmpty();
    return;
  }
  if (document.body.dataset.mineView !== "search") pushNavigationSnapshot();
  await openMusicSearchPageFromInput();
});

musicSearch?.addEventListener("input", () => {
  if (getActiveArtistSource()) {
    resetArtistPage();
    renderMusicSearchResults([]);
    renderArtistContent();
    return;
  }
  clearActivePlaylist();
  window.clearTimeout(musicSearchTimer);
  musicSearchTimer = window.setTimeout(() => {
    const openPage = document.body.dataset.mineView === "search";
    searchNeteaseMusic({ limit: openPage ? 20 : 12, openPage }).catch(() => renderMusicSearchResults([]));
  }, 450);
});

musicSearch?.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  const query = (musicSearch?.value || "").trim();
  event.preventDefault();
  if (!query) {
    closeMineSearchIfEmpty();
    return;
  }
  if (document.body.dataset.mineView !== "search") pushNavigationSnapshot();
  await openMusicSearchPageFromInput();
});

musicSearchPage?.addEventListener("scroll", () => {
  maybeLoadMoreMusicSearchResults(musicSearchPage);
});

document.querySelector("#minePage")?.addEventListener("scroll", (event) => {
  maybeLoadMoreMusicSearchResults(event.currentTarget);
  if (musicSearchPage?.hidden === false) {
    return;
  } else if (radioRecommendPanel?.hidden === false) {
    prewarmMoreCoversOnScroll(event.currentTarget, getRecommendTrackListForPanel(), "list");
  }
});

playlistNameSearch?.addEventListener("input", () => {
  if (!getActiveMinePlaylistId() && !getActiveArtistSource() && musicSearchPage?.hidden !== false) {
    renderMinePlaylist();
  }
});

musicSearchBackBtn?.addEventListener("click", () => {
  setMineSearchOpen(false);
  renderMinePlaylist();
});

artistTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveArtistTab(tab.dataset.artistTab);
  });
});

[artistSongPager, artistAlbumPager].forEach((pager) => {
  pager?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-artist-page]");
    if (!button || button.disabled) return;
    const dir = Number(button.dataset.pageDir || 0);
    moveArtistPage(button.dataset.artistPage, dir);
  });
});

artistAlbumList?.addEventListener("click", async (event) => {
  const albumCard = event.target.closest("[data-album-id]");
  if (!albumCard) return;
  await openAlbumPage({
    id: albumCard.dataset.albumId,
    name: albumCard.dataset.albumName || albumCard.textContent
  });
});

playlistSearch?.addEventListener("input", () => {
  const activeMinePlaylistId = getActiveMinePlaylistId();
  if (activeMinePlaylistId) renderPlaylistDetail(activeMinePlaylistId, { refresh: false });
});

playlistSearchToggle?.addEventListener("click", () => {
  setPlaylistSearchOpen(!playlistSearchBox?.classList.contains("is-open"));
});

chatLog.addEventListener("click", (event) => {
  const message = event.target.closest(".claudio-message");
  if (!message) return;
  if (message.classList.contains("is-thinking")) return;
  if (message.classList.contains("insight-message")) {
    const start = Number(message.dataset.insightIndex || 0);
    speakInsightFrom(start);
    return;
  }
  const speakText = message.dataset.speakText || message.textContent;
  speakDjLine(speakText, {
    enabled: false,
    key: `chat:${speakText}`,
    audioUrl: message.dataset.voiceUrl || "",
    mimeType: message.dataset.voiceMime || ""
  });
});

refreshBtn?.addEventListener("click", () => {
  refreshNow({ allowPause: false });
  refreshCapabilities();
});

audio.addEventListener("timeupdate", () => {
  const { pendingUserSeekTime, pendingUserSeekUntil } = getPendingSeekState();
  if (pendingUserSeekTime != null && Date.now() < pendingUserSeekUntil) {
    tryApplyPendingSeek();
    updateProgressUi(pendingUserSeekTime, getPlayableDuration());
  } else {
    updateProgressFromPlaybackClock(audio.currentTime || 0);
  }
  if (Number.isFinite(getLyricClockOverride())) {
    updateProgressUi(getPlaybackClockTime(audio.currentTime || 0), getPlayableDuration());
  } else {
    syncPlayerProgress();
  }
  syncAndroidMediaSession();
  if (model?.track?.id) renderLyric(model.track.id);
  persistPlaybackStateIfStale();
});

audio.addEventListener("loadedmetadata", () => {
  const { pendingSeekTime, pendingUserSeekTime } = getPendingSeekState();
  const currentTime = pendingUserSeekTime ?? pendingSeekTime ?? getPlaybackClockTime(audio.currentTime ?? 0);
  updateProgressUi(currentTime, getPlayableDuration());
  tryApplyPendingSeek();
  updateProgressFromPlaybackClock(audio.currentTime || currentTime || 0);
});
["durationchange", "canplay", "canplaythrough", "progress", "seeked"].forEach((eventName) => {
  audio.addEventListener(eventName, () => {
    const { pendingSeekTime, pendingUserSeekTime } = getPendingSeekState();
    if (pendingUserSeekTime != null || pendingSeekTime > 0) {
      tryApplyPendingSeek();
    }
    if (Number.isFinite(getLyricClockOverride())) {
      updateProgressFromPlaybackClock(audio.currentTime || 0);
    } else {
      syncPlayerProgress();
    }
    syncAndroidMediaSession();
  });
});
audio.addEventListener("error", async () => {
  stopEqualizer({ hide: true });
  const track = model?.track;
  if (track?.source !== "netease" || !track.sourceId) return;
  const shouldResume = userStartedPlayback;
  const retryKey = `${track.sourceId}:${track.src || audio.currentSrc || ""}`;
  if (neteaseFreeTrialOnlySongIds.has(String(track.sourceId))) {
    renderClaudioNotice(NETEASE_FREE_TRIAL_NOTICE, { key: "netease-url-error" });
    syncPlayUi();
    return;
  }
  if (neteaseAudioRetryKey === retryKey) {
    renderClaudioNotice("这首歌暂时播放不了，已经保留在队列里。", { key: "netease-url-error" });
    syncPlayUi();
    return;
  }
  neteaseAudioRetryKey = retryKey;
  const restorePosition = audio.currentTime > 1 || shouldRestoreTrackPosition(track, model?.state);
  renderClaudioNotice("正在重新获取这首歌的播放链接。", { key: "netease-url-error" });
  await playNeteaseTrack(track, { restorePosition, refreshUrl: true, autoStart: shouldResume }).catch((error) => {
    renderClaudioNotice(
      isNeteaseFreeTrialOnlyError(error)
        ? NETEASE_FREE_TRIAL_NOTICE
        : "这首歌暂时播放不了，已经保留在队列里。",
      { key: "netease-url-error" }
    );
    syncPlayUi();
  });
  if (!shouldResume) {
    audio.pause();
    userStartedPlayback = false;
    syncPlayUi();
  }
});
audio.addEventListener("play", () => {
  startEqualizer();
  syncPlayUi();
  resumeVoiceForMusic();
  warmUpcomingQueue(model?.queue || []);
  persistPlaybackState({ immediate: true });
});
audio.addEventListener("pause", () => {
  stopEqualizer({ hide: true });
  syncPlayUi();
  pauseVoiceForMusic();
  warmUpcomingQueue(model?.queue || []);
  persistPlaybackState({ immediate: true });
});
audio.addEventListener("ended", () => {
  stopEqualizer({ hide: true });
  persistPlaybackState({ immediate: true });
  pauseVoiceForMusic();
  const endAction = getPlaybackEndAction(playMode, model?.queue || [], model?.track, activeQueueIndex, model?.state);
  if (endAction.action === "replay") {
    audio.currentTime = 0;
    setLyricClockOverride(0);
    playAudioWithDiagnostics(audio, {
      renderNotice: renderClaudioNotice,
      context: getAudioPlayContext()
    }).catch(() => {});
    return;
  }
  if (endAction.action === "stop") {
    syncPlayUi();
    return;
  }
  nextBtn.click();
});

progress.addEventListener("input", () => {
  const durationValue = getPlayableDuration();
  const percent = Number(progress.value) / 10;
  if (durationValue) {
    requestAudioSeek((percent / 100) * durationValue, { user: true });
  }
  persistPlaybackState();
});

function flushPlaybackState() {
  persistPlaybackState({ immediate: true });
}

window.addEventListener("beforeunload", () => {
  flushPlaybackState();
});

window.addEventListener("pagehide", () => {
  persistPlaybackState({ immediate: true });
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    persistPlaybackState({ immediate: true });
  }
});

window.Capacitor?.Plugins?.App?.addListener("pause", () => {
  persistPlaybackState({ immediate: true });
});

window.Capacitor?.Plugins?.App?.addListener("appStateChange", ({ isActive } = {}) => {
  if (!isActive) persistPlaybackState({ immediate: true });
});

queueList?.addEventListener("click", async (event) => {
  const item = event.target.closest("[data-track-index]");
  if (!item || !model) return;
  const index = Number(item.dataset.trackIndex);
  await playQueueTrackAt(index);
});

queueToggle.addEventListener("click", () => {
  setQueueOpen(queuePopover?.hidden !== false);
});

queuePanelList.addEventListener("click", async (event) => {
  const modeButton = event.target.closest("[data-queue-mode]");
  if (modeButton) {
    event.stopPropagation();
    await cyclePlayMode();
    renderQueueDock(model?.queue || [], model?.track?.id);
    return;
  }

  const removeButton = event.target.closest("[data-remove-index]");
  if (removeButton && model?.queue) {
    await removeTrackFromPlaybackQueue(Number(removeButton.dataset.removeIndex));
    renderQueueDock(model.queue, model.track.id);
    return;
  }
  const nextButton = event.target.closest("[data-next-index]");
  if (nextButton && model?.queue) {
    const track = model.queue[Number(nextButton.dataset.nextIndex)];
    if (track) {
      setTrackAsNext({ dataset: {}, __track: track });
      renderQueueDock(model.queue, model.track.id);
    }
    return;
  }

  const playButton = event.target.closest("[data-play-index]");
  if (!playButton) return;
  const index = Number(playButton.dataset.playIndex);
  await playQueueTrackAt(index);
});

minePlaylistList?.addEventListener("click", async (event) => {
  const playlistButton = event.target.closest("[data-playlist-id]");
  if (playlistButton) {
    pushNavigationSnapshot();
    setPlaylistSearchOpen(false);
    renderPlaylistDetail(playlistButton.dataset.playlistId, { refresh: false });
    return;
  }

  await handleTrackRowAction(event, { allowRemove: true });
});

playlistTrackList?.addEventListener("click", async (event) => {
  await handleTrackRowAction(event, { allowRemove: true });
});

artistSongList?.addEventListener("click", async (event) => {
  await handleTrackRowAction(event);
});

musicSearchPageList?.addEventListener("click", async (event) => {
  await handleTrackRowAction(event, { allowPlayerOpen: false });
});

dailyRecommendCard?.addEventListener("click", () => {
  if (!radioRecommendPanel?.hidden && radioRecommendPanel?.dataset.recommendPanel === "daily") {
    radioRecommendPanel.hidden = true;
    closeTrackMenus();
    return;
  }
  loadDailyRecommendSongs().catch(() => {
    if (dailyRecommendMeta) dailyRecommendMeta.textContent = "每日推荐读取失败";
    if (radioRecommendList) {
      radioRecommendList.innerHTML = `<div class="mine-empty">每日推荐暂时读取失败，请确认网易云登录状态。</div>`;
    }
  });
});

claudeRecommendCard?.addEventListener("click", () => {
  if (!radioRecommendPanel?.hidden && radioRecommendPanel?.dataset.recommendPanel === "claude") {
    radioRecommendPanel.hidden = true;
    closeTrackMenus();
    return;
  }
  renderRadioRecommendPanel("claude");
});

historyRecommendBtn?.addEventListener("click", () => {
  if (radioRecommendPanel?.dataset.recommendPanel === "history") {
    loadDailyRecommendSongs().catch(() => {
      renderRadioRecommendPanel("daily");
    });
    return;
  }
  loadHistoryRecommendSongs();
});

radioRecommendClose?.addEventListener("click", () => {
  if (radioRecommendPanel) radioRecommendPanel.hidden = true;
  closeTrackMenus();
});

radioRecommendList?.addEventListener("click", async (event) => {
  await handleTrackRowAction(event);
});

albumTrackList?.addEventListener("click", async (event) => {
  await handleTrackRowAction(event);
});

playlistBackBtn?.addEventListener("click", () => {
  if (restorePreviousNavigationTarget()) return;
  showMineTopLevelPage({ suppressSnapshot: true });
});

albumBackBtn?.addEventListener("click", () => {
  if (restorePreviousNavigationTarget()) return;
  resetAlbumState();
  setAppPageWithoutSnapshot("artist");
});

artistBackBtn?.addEventListener("click", () => {
  if (restorePreviousNavigationTarget()) return;
  showArtistBackTarget();
  setAppPageWithoutSnapshot("mine");
});

collectModalClose?.addEventListener("click", closeCollectModal);
collectModalBackdrop?.addEventListener("click", closeCollectModal);
collectPlaylistList?.addEventListener("click", handlePlaylistListClick);

document.addEventListener("click", (event) => {
  if (!event.target.closest(".styled-select-shell")) {
    closeStyledSelects();
  }
  if (!event.target.closest(".mine-track-actions")) {
    closeTrackMenus();
  }
  if (playlistSearchBox?.classList.contains("is-open") && !event.target.closest("#playlistSearchBox")) {
    setPlaylistSearchOpen(false);
  }
  if (queuePopover.hidden) return;
  if (event.target.closest("#queueToggle") || event.target.closest("#queuePopover")) return;
  setQueueOpen(false);
});

document.addEventListener("click", (event) => {
  if (playerQueuePanel?.hidden !== false) return;
  if (event.target.closest("#playerQueueBtn") || event.target.closest("#playerQueuePanel")) return;
  setPlayerQueueOpen(false);
});

document.addEventListener("click", (event) => {
  if (queueSheet?.hidden !== false) return;
  if (event.target.closest("#queueSheet") || event.target.closest("#queueToggle") || event.target.closest("#playerQueueBtn")) return;
  setQueueSheetOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeStyledSelects();
});

chatForm.addEventListener("submit", handleChatSubmit);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
}

buildEqualizer();
loadNorthernBackground();
initVoiceSettings();
syncPasswordLoginMode();
initStyledSelects();
loadApiSettings();
renderDailyRecommendCard();
refreshNeteaseStatus();
setDjMode(djModeEnabled);
setDjOnline(true);
setAppPage("radio");
initSpeechToText();
bindAndroidMediaSessionEvents();
renderClock({ clock: stageClock, weekday: stageWeekday });
setInterval(() => renderClock({ clock: stageClock, weekday: stageWeekday }), 1000);
if (!restorePlaybackFromStorage()) {
  refreshNow().then(() => refreshCapabilities());
} else {
  refreshWeatherUntilReady();
  refreshCapabilities();
}
window.setTimeout(refreshCapabilities, 1800);
window.setTimeout(refreshWeatherUntilReady, 1800);

createAndroidBackNavigationController({
  appPlugin: window.Capacitor?.Plugins?.App,
  documentRef: document,
  getPlayerReturnPage: () => playerReturnPage,
  getBackTarget: popNavigationBackTarget,
  restoreBackTarget: restoreNavigationSnapshot,
  setAppPage: setAppPageWithoutSnapshot,
  showMineList: () => showMineTopLevelPage({ suppressSnapshot: true }),
  showArtistList: showArtistBackTarget
}).bindAndroidBackNavigation();

}

