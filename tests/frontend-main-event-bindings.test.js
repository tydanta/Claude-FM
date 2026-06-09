import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../public/modules/main.js", import.meta.url), "utf8");

const queueToggleBinding = source.match(/queueToggle\.addEventListener\("click", \(\) => \{(?<body>[\s\S]*?)\n\}\);/);
const playerBackBinding = source.match(/playerBackBtn\?\.addEventListener\("click", \(\) => \{(?<body>[\s\S]*?)\n\}\);/);
const openPlayerPageBinding = source.match(/function openPlayerPage\(\) \{(?<body>[\s\S]*?)\n\}/);

assert.ok(queueToggleBinding, "queueToggle click binding should exist");
assert.match(queueToggleBinding.groups.body, /setQueueOpen\(/);
assert.doesNotMatch(queueToggleBinding.groups.body, /setQueueSheetOpen\(/);
assert.ok(playerBackBinding, "playerBackBtn click binding should exist");
assert.match(playerBackBinding.groups.body, /setAppPageWithoutSnapshot\(/);
assert.ok(openPlayerPageBinding, "openPlayerPage should exist");
assert.match(openPlayerPageBinding.groups.body, /suppressNextPageSnapshot\s*=\s*true/);
assert.match(openPlayerPageBinding.groups.body, /setAppPage\("player"\)/);
assert.match(source, /window\.addEventListener\("pagehide", \(\) => \{[\s\S]*?persistPlaybackState\(\{ immediate: true \}\)/);
assert.match(source, /document\.addEventListener\("visibilitychange", \(\) => \{[\s\S]*?document\.visibilityState === "hidden"[\s\S]*?persistPlaybackState\(\{ immediate: true \}\)/);
assert.match(source, /window\.Capacitor\?\.Plugins\?\.App\?\.addListener\("pause"/);

console.log("frontend-main-event-bindings tests passed");
