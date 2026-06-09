export function createNowPayloadService({
  state,
  tracks,
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
}) {
  function getCurrentMockTrack() {
    return tracks[state.currentIndex % tracks.length];
  }

  function getPlaybackPlaylistSnapshot(playlist, fallback = null) {
    return playlist ? {
      id: playlist.id,
      source: playlist.source,
      sourceId: playlist.sourceId,
      title: playlist.title,
      subtitle: playlist.subtitle,
      description: playlist.description,
      cover: playlist.cover,
      trackCount: playlist.trackCount
    } : fallback;
  }

  function mapQueueLikedState(queue = []) {
    return queue.map((item) => item.source === "netease"
      ? { ...item, liked: isLocalTrackLiked(item.id, item.sourceId) }
      : item);
  }

  function restoreNeteasePlayback(savedPlayback, savedPlaybackQueue) {
    const playlistKey = savedPlayback.playlistSourceId || savedPlayback.playlistId;
    const dailyPlaylist = getPlaybackDailyRecommendationPlaylist(savedPlayback);
    const playlist = dailyPlaylist || (playlistKey
      ? getLocalNeteasePlaylistDetail(playlistKey)
      : findLocalNeteasePlaylistForTrack({
          trackId: savedPlayback.trackId,
          sourceTrackId: savedPlayback.sourceTrackId
        }));
    const playlistTrack = playlist?.tracks?.find((item) =>
      item.id === savedPlayback.trackId || item.sourceId === savedPlayback.sourceTrackId
    );
    const localTrack = playlistTrack
      || getLocalTrackById(savedPlayback.trackId)
      || getLocalTrackBySourceId(savedPlayback.sourceTrackId);

    if (!localTrack) return null;

    const cachedUrl = localTrack.sourceId ? readNeteaseUrlCache(localTrack.sourceId) : null;
    const track = {
      ...localTrack,
      src: localTrack.src || cachedUrl?.url || "",
      liked: isLocalTrackLiked(localTrack.id, localTrack.sourceId)
    };
    let queue = savedPlaybackQueue.length ? savedPlaybackQueue : (playlist?.tracks?.length ? playlist.tracks : [track]);
    if (!queue.some((item) => item.id === track.id || (item.sourceId && item.sourceId === track.sourceId))) {
      queue = [track, ...queue];
    }

    const playbackPlaylist = getPlaybackPlaylistSnapshot(playlist, savedPlayback.payload?.playlist || null);
    const playback = {
      position: savedPlayback.position,
      duration: savedPlayback.duration,
      source: savedPlayback.source,
      playlistId: playbackPlaylist?.id || savedPlayback.playlistId || "",
      playlistSourceId: playbackPlaylist?.sourceId || savedPlayback.playlistSourceId || "",
      updatedAt: savedPlayback.updatedAt,
      playlist: playbackPlaylist
    };

    if (playbackPlaylist && (!savedPlayback.playlistId || !savedPlayback.playlistSourceId)) {
      savePlaybackState({
        track,
        playlist: playbackPlaylist,
        queue,
        position: savedPlayback.position,
        duration: savedPlayback.duration || track.duration,
        isPlaying: false
      });
    }

    return { track, queue, playback };
  }

  async function buildBasePayload({ location = null } = {}) {
    const [weather, schedule] = await Promise.all([getWeather(location), getSchedule()]);
    const savedPlayback = readPlaybackState();
    const savedPlaybackQueue = readPlaybackQueueItems();
    let track = getCurrentMockTrack();
    let queue = tracks;
    let playback = savedPlayback
      ? {
          position: savedPlayback.position,
          duration: savedPlayback.duration,
          source: savedPlayback.source,
          playlistId: savedPlayback.playlistId,
          playlistSourceId: savedPlayback.playlistSourceId,
          updatedAt: savedPlayback.updatedAt
        }
      : null;

    if (savedPlayback?.source === "netease") {
      const restored = restoreNeteasePlayback(savedPlayback, savedPlaybackQueue);
      if (restored) {
        track = restored.track;
        queue = restored.queue;
        playback = restored.playback;
      }
    } else if (savedPlayback?.trackId) {
      const savedMockIndex = tracks.findIndex((item) => item.id === savedPlayback.trackId);
      if (savedMockIndex >= 0) {
        state.currentIndex = savedMockIndex;
        track = tracks[savedMockIndex];
        queue = tracks;
      }
    }

    const timeBlock = getTimeBlock();
    const djLine = await askClaudeForDjLine({ weather, schedule, track, timeBlock });
    return {
      state: {
        ...state,
        playback,
        position: playback?.position || 0,
        isPlaying: false
      },
      track,
      queue: mapQueueLikedState(queue),
      weather,
      schedule,
      djLine,
      insight: null,
      insightError: null,
      insightPending: true,
      integrations: getIntegrations()
    };
  }

  async function buildNowPayload({ includeInsight = true, location = null } = {}) {
    const base = await buildBasePayload({ location });
    if (!includeInsight) return base;
    const { insight, insightError } = await getInsightForTrack(
      base.track,
      base.weather,
      base.schedule,
      getTimeBlock()
    );
    return {
      ...base,
      insight,
      insightError,
      insightPending: false
    };
  }

  return {
    buildBasePayload,
    buildNowPayload
  };
}
