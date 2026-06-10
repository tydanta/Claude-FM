import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const compactHtml = html.replace(/\s+/g, " ");

assert.match(
  compactHtml,
  /<details class="settings-item settings-panel audio-quality-settings">[\s\S]*?<strong>音质设置<\/strong>[\s\S]*?<select id="neteaseAudioLevelSelect" name="neteaseAudioLevel">/i,
  "Netease audio quality should be promoted to a top-level settings menu"
);

const apiSettingsBlock = compactHtml.match(/<details class="settings-item settings-panel api-settings">[\s\S]*?<\/details>/i)?.[0] || "";
assert.doesNotMatch(apiSettingsBlock, /neteaseAudioLevelSelect|<legend>网易云音乐<\/legend>/i, "API model settings should not contain Netease audio quality controls");

console.log("settings audio quality layout tests passed");
