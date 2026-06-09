import assert from "node:assert/strict";
import {
  getChatMessageDataset,
  renderAssistantMessageHtml,
  renderUserMessageHtml
} from "../public/modules/claudio/chatController.js";

assert.equal(renderUserMessageHtml("<hello>"), "<b>&lt;hello&gt;</b>");
assert.match(renderAssistantMessageHtml("hi"), /claudio-avatar tiny/);
assert.match(renderAssistantMessageHtml("<hi>"), /&lt;hi&gt;/);

assert.deepEqual(
  getChatMessageDataset("hello", { audioUrl: "/voice.wav", mimeType: "audio/wav" }),
  { speakText: "hello", voiceUrl: "/voice.wav", voiceMime: "audio/wav" }
);

console.log("frontend-chat-controller tests passed");
