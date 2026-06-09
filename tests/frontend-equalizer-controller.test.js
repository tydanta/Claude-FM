import assert from "node:assert/strict";
import {
  buildEqualizerMarkup,
  calculateEqualizerHeights,
  getNextSilentFrameCount
} from "../public/modules/player/equalizerController.js";

const markup = buildEqualizerMarkup(3);
assert.match(markup, /--i:0/);
assert.match(markup, /--i:2/);
assert.equal((markup.match(/eq-bar/g) || []).length, 3);

const heights = calculateEqualizerHeights(Uint8Array.from([0, 64, 128, 255]), 2);
assert.equal(heights.length, 2);
assert.ok(heights[0] >= 1);
assert.ok(heights[1] > heights[0]);

assert.equal(getNextSilentFrameCount(1.9, 4), 5);
assert.equal(getNextSilentFrameCount(2, 4), 0);

console.log("frontend-equalizer-controller tests passed");
