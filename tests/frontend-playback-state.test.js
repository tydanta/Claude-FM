import assert from "node:assert/strict";
import {
  PLAY_MODES,
  getActiveQueueIndex,
  getCurrentIndex,
  getNextPlaybackIndex,
  getPlaylistTrackPlayMode,
  getPlayableDuration,
  getPlaybackEndAction,
  getProgressPercent,
  getSequentialNextIndex,
  getValidatedPlayMode,
  isSameTrack,
  cyclePlayModeId
} from "../public/modules/player/playbackState.js";

const queue = [
  { id: "a", sourceId: "10" },
  { id: "b", sourceId: "20" },
  { id: "c", sourceId: "30" }
];

assert.equal(PLAY_MODES.length, 5);
assert.equal(getValidatedPlayMode("random"), "random");
assert.equal(getValidatedPlayMode("bad"), "order");
assert.equal(cyclePlayModeId("order"), "loop");
assert.equal(cyclePlayModeId("heartbeat"), "order");
assert.equal(getPlaylistTrackPlayMode("order"), "loop");
assert.equal(getPlaylistTrackPlayMode("heartbeat"), "loop");

assert.equal(isSameTrack({ id: "x" }, { id: "x" }), true);
assert.equal(isSameTrack({ sourceId: "1" }, { sourceId: "1" }), true);
assert.equal(isSameTrack({ sourceId: 1 }, { sourceId: "1" }), true);
assert.equal(isSameTrack({ id: "x" }, { id: "y" }), false);

assert.equal(getActiveQueueIndex(queue, queue[1], 1), 1);
assert.equal(getActiveQueueIndex(queue, queue[2], 1), 2);
assert.equal(getActiveQueueIndex([], queue[0], 0), -1);

assert.equal(getCurrentIndex(queue, queue[1], 1, { currentIndex: 0 }), 1);
assert.equal(getCurrentIndex(queue, { id: "missing" }, null, { currentIndex: 2 }), 2);

assert.equal(getSequentialNextIndex(queue, queue[1], 1), 2);
assert.equal(getSequentialNextIndex(queue, queue[2], 2), -1);
assert.equal(getNextPlaybackIndex(queue, queue[2], 2, "order"), -1);
assert.equal(getNextPlaybackIndex(queue, queue[2], 2, "loop"), 0);

assert.equal(getPlayableDuration(123, 456), 123);
assert.equal(getPlayableDuration(Number.NaN, 456), 456);
assert.equal(getProgressPercent(25, 100), 25);
assert.equal(getProgressPercent(150, 100), 100);
assert.equal(getProgressPercent(-1, 100), 0);
assert.equal(getProgressPercent(10, 0), 0);

assert.deepEqual(getPlaybackEndAction("single", queue, queue[1], 1), { action: "replay" });
assert.deepEqual(getPlaybackEndAction("order", queue, queue[2], 2), { action: "stop" });
assert.deepEqual(getPlaybackEndAction("loop", queue, queue[2], 2), { action: "next", index: 0 });

console.log("frontend-playback-state tests passed");
