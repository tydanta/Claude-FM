import assert from "node:assert/strict";
import { escapeHtml, formatBytes, formatTime } from "../public/modules/ui/formatting.js";

assert.equal(formatTime(0), "0:00");
assert.equal(formatTime(65.9), "1:05");
assert.equal(formatTime(Number.NaN), "0:00");

assert.equal(formatBytes(0), "0 KB");
assert.equal(formatBytes(512), "512 B");
assert.equal(formatBytes(1536), "1.5 KB");
assert.equal(formatBytes(10 * 1024), "10 KB");
assert.equal(formatBytes(3 * 1024 * 1024), "3.0 MB");

assert.equal(escapeHtml('&<>"'), "&amp;&lt;&gt;&quot;");
assert.equal(escapeHtml(null), "null");

console.log("frontend-formatting tests passed");
