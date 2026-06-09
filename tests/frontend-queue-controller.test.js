import assert from "node:assert/strict";
import {
  buildPlaylistPlaybackState,
  getUpcomingTracks,
  insertTrackAfterCurrent,
  removeTrackAtIndex
} from "../public/modules/player/queueController.js";

const queue = [
  { id: "a", sourceId: "10" },
  { id: "b", sourceId: "20" },
  { id: "c", sourceId: "30" }
];

{
  const result = insertTrackAfterCurrent(queue, { id: "x" }, 1);
  assert.equal(result.insertIndex, 2);
  assert.equal(result.activeQueueIndex, 1);
  assert.deepEqual(result.queue.map((track) => track.id), ["a", "b", "x", "c"]);
  assert.notEqual(result.queue, queue);
}

{
  const result = removeTrackAtIndex(queue, 0, 2);
  assert.equal(result.removed, true);
  assert.equal(result.shouldPlayReplacement, false);
  assert.equal(result.activeQueueIndex, 1);
  assert.deepEqual(result.queue.map((track) => track.id), ["b", "c"]);
}

{
  const result = removeTrackAtIndex(queue, 1, 1);
  assert.equal(result.removed, true);
  assert.equal(result.shouldPlayReplacement, true);
  assert.equal(result.activeQueueIndex, 1);
  assert.deepEqual(result.queue.map((track) => track.id), ["a", "c"]);
}

assert.equal(removeTrackAtIndex([queue[0]], 0, 0).removed, false);

{
  const playlist = {
    id: "p1",
    source: "netease",
    sourceId: "source-p1",
    title: "歌单",
    tracks: queue
  };
  const result = buildPlaylistPlaybackState(playlist, queue[1], { state: { volume: 0.5 } });
  assert.equal(result.index, 1);
  assert.equal(result.queue.length, 3);
  assert.equal(result.modelPatch.state.volume, 0.5);
  assert.equal(result.modelPatch.state.playback.playlist.title, "歌单");
  assert.equal(result.modelPatch.state.playback.sourceTrackId, "20");
}

assert.deepEqual(getUpcomingTracks(queue, 1, "order", 3).map((track) => track.id), ["c"]);
assert.deepEqual(getUpcomingTracks(queue, 2, "order", 3), []);
assert.deepEqual(getUpcomingTracks(queue, 2, "loop", 3).map((track) => track.id), ["a", "b"]);

console.log("frontend-queue-controller tests passed");
