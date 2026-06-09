import assert from "node:assert/strict";
import {
  getNorthernBackgroundPayload,
  normalizeNorthernBackground,
  validateNorthernBackgroundFile
} from "../public/modules/settings/backgroundSettings.js";

assert.deepEqual(
  normalizeNorthernBackground({ mode: "custom", imageUrl: "/uploads/bg.jpg" }),
  { mode: "custom", imageUrl: "/uploads/bg.jpg" }
);

assert.deepEqual(
  normalizeNorthernBackground({ mode: "bad", imageUrl: "/uploads/bg.jpg" }),
  { mode: "dark", imageUrl: "/uploads/bg.jpg" }
);

assert.deepEqual(getNorthernBackgroundPayload("custom", "cached-url"), { mode: "custom", imageUrl: "cached-url" });
assert.deepEqual(getNorthernBackgroundPayload("light", "cached-url"), { mode: "light", imageUrl: "" });

assert.equal(validateNorthernBackgroundFile({ type: "image/png", size: 1024 }), "");
assert.equal(validateNorthernBackgroundFile({ type: "text/plain", size: 1024 }), "type");
assert.equal(validateNorthernBackgroundFile({ type: "image/jpeg", size: 9 * 1024 * 1024 }), "size");

console.log("frontend-background-settings tests passed");
