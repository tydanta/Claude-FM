import assert from "node:assert/strict";
import {
  getInsightCacheClientKey,
  getVoiceClientCacheKey
} from "../public/modules/chat/voiceCacheKeys.js";

assert.equal(
  getVoiceClientCacheKey("  Claudio\u00A0\u201C你好\u201D  ", { preset: "冰糖" }),
  'Claudio "你好"|冰糖|preset'
);

assert.equal(
  getVoiceClientCacheKey("hello", { preset: "Mia", customPrompt: "深夜电台" }),
  "hello|Mia|custom:深夜电台"
);

assert.equal(
  getVoiceClientCacheKey("hello", {}),
  "hello||preset"
);

assert.equal(
  getInsightCacheClientKey("track-1", { language: "zh", preset: "冰糖" }),
  "track-1:zh:冰糖:preset"
);

assert.equal(
  getInsightCacheClientKey("track-1", { language: "en", preset: "Mia", customPrompt: "warm" }),
  "track-1:en:Mia:custom"
);

console.log("frontend-voice-cache-keys tests passed");
