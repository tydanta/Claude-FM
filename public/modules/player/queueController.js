import { getCurrentIndex, isSameTrack } from "./playbackState.js";

export function insertTrackAfterCurrent(queue = [], track, currentIndex = 0) {
  if (!track || !queue.length) return { queue, insertIndex: -1, activeQueueIndex: currentIndex };
  const safeCurrentIndex = Math.max(0, Number(currentIndex || 0));
  const insertIndex = Math.min(safeCurrentIndex + 1, queue.length);
  const nextQueue = queue.slice();
  nextQueue.splice(insertIndex, 0, { ...track });
  return {
    queue: nextQueue,
    insertIndex,
    activeQueueIndex: safeCurrentIndex
  };
}

export function removeTrackAtIndex(queue = [], index, currentIndex = 0) {
  if (!Number.isInteger(index) || index < 0 || index >= queue.length || queue.length <= 1) {
    return { queue, activeQueueIndex: currentIndex, removed: false, shouldPlayReplacement: false };
  }
  const nextQueue = queue.slice();
  const removingCurrent = index === currentIndex;
  nextQueue.splice(index, 1);
  if (removingCurrent) {
    return {
      queue: nextQueue,
      activeQueueIndex: Math.min(index, nextQueue.length - 1),
      removed: true,
      shouldPlayReplacement: true
    };
  }
  return {
    queue: nextQueue,
    activeQueueIndex: index < currentIndex ? currentIndex - 1 : currentIndex,
    removed: true,
    shouldPlayReplacement: false
  };
}

export function buildPlaylistPlaybackState(playlist, track, model = {}) {
  if (!playlist?.tracks?.length || !track) return null;
  const queue = playlist.tracks.slice();
  const index = queue.findIndex((item) => isSameTrack(item, track));
  if (index < 0) return null;
  return {
    queue,
    index,
    modelPatch: {
      queue,
      state: {
        ...(model?.state || {}),
        playback: {
          ...(model?.state?.playback || {}),
          source: "netease",
          trackId: track.id || "",
          sourceTrackId: track.sourceId || "",
          playlistId: playlist.id || "",
          playlistSourceId: playlist.sourceId || "",
          playlist: {
            id: playlist.id || "",
            source: playlist.source || "netease",
            sourceId: playlist.sourceId || "",
            title: playlist.title || "",
            subtitle: playlist.subtitle || "",
            description: playlist.description || "",
            cover: playlist.cover || "",
            trackCount: playlist.trackCount || queue.length
          }
        }
      }
    }
  };
}

export function getUpcomingTracks(queue = [], currentIndex = 0, playMode = "order", count = 3) {
  if (!queue.length) return [];
  const resolvedIndex = Number.isInteger(currentIndex) ? currentIndex : getCurrentIndex(queue);
  if (resolvedIndex < 0) return [];
  const tracks = [];
  const maxOffset = playMode === "order"
    ? Math.min(count, queue.length - resolvedIndex - 1)
    : Math.min(count, Math.max(0, queue.length - 1));
  for (let offset = 1; offset <= maxOffset; offset += 1) {
    tracks.push(queue[(resolvedIndex + offset) % queue.length]);
  }
  return tracks;
}
