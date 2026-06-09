import assert from "node:assert/strict";
import { createInsightController } from "../public/modules/claudio/insightController.js";

const inserted = [];
const chatLog = {
  dataset: {},
  insertAdjacentHTML(_position, html) {
    inserted.push(html);
  },
  querySelectorAll() {
    return [];
  }
};

const controller = createInsightController({
  api: async () => ({}),
  chatLog,
  djLine: { textContent: "" },
  getCurrentTrackId: () => "track-1",
  getDjModeEnabled: () => true,
  getVoiceSettings: () => ({}),
  getUpcomingTracks: () => [],
  getUserStartedPlayback: () => false,
  renderClaudioNotice: () => {},
  clearClaudioNotice: () => {},
  getFriendlyModelError: (value) => String(value || ""),
  renderInsightLoading: () => {},
  warmInsightVoice: () => {},
  autoSpeakInsight: () => {},
  windowRef: { setTimeout: () => {} }
});

controller.renderInsight({
  english: ["第一段需要按时长扫过。", "第二段也一样。"],
  chinese: []
});

assert.equal(inserted.length, 1);
assert.match(inserted[0], /voice-progress-highlight/);
assert.match(inserted[0], /data-voice-line-index="0"/);
assert.match(inserted[0], /data-voice-line-index="1"/);
assert.doesNotMatch(inserted[0], /insight-word/);
assert.equal(chatLog.dataset.insightSegmentCount, "2");

console.log("frontend insight progress highlight tests passed");
