import assert from "node:assert/strict";
import {
  buildSeekRequestState,
  clampSeekTarget,
  shouldClearPendingSeek
} from "../public/modules/player/audioController.js";

assert.equal(clampSeekTarget(50, 100), 50);
assert.equal(clampSeekTarget(150, 100), 99.8);
assert.equal(clampSeekTarget(-5, 100), 0);
assert.equal(clampSeekTarget(12, 0), 12);

assert.deepEqual(
  buildSeekRequestState(150, 100, { user: true, now: 1000 }),
  {
    safeTarget: 99.8,
    pendingSeekTime: 0,
    pendingUserSeekTime: 99.8,
    pendingUserSeekUntil: 13000,
    suppressProgressSyncUntil: 1900
  }
);

assert.deepEqual(
  buildSeekRequestState(15, 100, { user: false, now: 1000 }),
  {
    safeTarget: 15,
    pendingSeekTime: 15,
    pendingUserSeekTime: null,
    pendingUserSeekUntil: 0,
    suppressProgressSyncUntil: 0
  }
);

assert.equal(shouldClearPendingSeek(20.1, 20), true);
assert.equal(shouldClearPendingSeek(22, 20), false);

console.log("frontend-audio-controller tests passed");
