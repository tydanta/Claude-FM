import assert from "node:assert/strict";
import {
  buildInsightQuery,
  createInsightCacheKey
} from "../public/modules/claudio/insightController.js";

const settings = { language: "en", preset: "Mia", customPrompt: "warm" };

assert.equal(createInsightCacheKey("track-1", settings), "track-1:en:Mia:custom");

assert.equal(
  buildInsightQuery("track-1", settings).toString(),
  "trackId=track-1&voiceLanguage=en&voicePreset=Mia&voiceCustom=1"
);

assert.match(
  buildInsightQuery("track-1", settings, { force: true, now: () => 123 }).toString(),
  /refresh=123/
);

console.log("frontend-insight-controller tests passed");
