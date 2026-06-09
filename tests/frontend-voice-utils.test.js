import assert from "node:assert/strict";
import { getSpeechChunks, sanitizeVoiceText } from "../public/modules/chat/voiceUtils.js";

assert.equal(sanitizeVoiceText("  Claudio\u00A0\u201Chello\u201D\u2014ok\u2026  "), 'Claudio "hello"-ok...');
assert.equal(sanitizeVoiceText("A\u0000B\u0007C"), "A B C");
assert.equal(sanitizeVoiceText("\uD800broken"), "broken");
assert.equal(sanitizeVoiceText(null), "");

assert.deepEqual(getSpeechChunks("  你好\u3000Claudio  "), ["你好 Claudio"]);
assert.deepEqual(getSpeechChunks("fallback", [" 第一段 ", "", "\uD800第二段"]), ["第一段", "第二段"]);
assert.deepEqual(getSpeechChunks("   "), []);

console.log("frontend-voice-utils tests passed");
