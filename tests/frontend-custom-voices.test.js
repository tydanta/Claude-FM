import assert from "node:assert/strict";
import {
  getCustomVoiceName,
  normalizeCustomVoiceItems
} from "../public/modules/chat/customVoices.js";

assert.equal(getCustomVoiceName(""), "自定义音色");
assert.equal(getCustomVoiceName("  温柔   低沉  "), "温柔 低沉");
assert.equal(getCustomVoiceName("1234567890123"), "123456789012...");

assert.deepEqual(
  normalizeCustomVoiceItems([
    { id: " a ", name: " 夜航 ", prompt: "  温柔 DJ  " },
    { id: "", prompt: "有描述" },
    { id: "empty", prompt: "   " },
    null
  ], { createId: () => "generated" }),
  [
    { id: "a", name: "夜航", prompt: "温柔 DJ" },
    { id: "generated", name: "自定义音色", prompt: "有描述" }
  ]
);

assert.deepEqual(normalizeCustomVoiceItems("bad"), []);

console.log("frontend-custom-voices tests passed");
