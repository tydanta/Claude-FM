import assert from "node:assert/strict";
import {
  getPageSlideOffset,
  getPlayerReturnPage,
  resolveAppPage
} from "../public/modules/navigation.js";

assert.equal(resolveAppPage("mine"), "mine");
assert.equal(resolveAppPage("album"), "album");
assert.equal(resolveAppPage("bad"), "radio");
assert.equal(getPlayerReturnPage({ nextPage: "mine", previousPage: "radio", currentReturnPage: "radio" }), "mine");
assert.equal(getPlayerReturnPage({ nextPage: "player", previousPage: "mine", currentReturnPage: "mine" }), "mine");
assert.equal(getPlayerReturnPage({ nextPage: "settings", previousPage: "player", currentReturnPage: "mine" }), "mine");
assert.equal(getPageSlideOffset("settings", "mine"), "28px");
assert.equal(getPageSlideOffset("album", "artist"), "28px");
assert.equal(getPageSlideOffset("radio", "settings"), "-28px");

console.log("frontend-navigation tests passed");
