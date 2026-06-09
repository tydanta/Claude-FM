import assert from "node:assert/strict";
import { renderArtistAlbums } from "../public/modules/netease/artistView.js";

const html = renderArtistAlbums([
  { id: 123, name: "Nothing But The Beat", picUrl: "cover.jpg", publishTime: Date.UTC(2011, 0, 1) }
], (cover, target) => `/cover/${target}/${cover}`);

assert.match(html, /<button class="artist-album-card"/, "artist album cards should be clickable buttons");
assert.match(html, /type="button"/, "artist album cards should not submit forms");
assert.match(html, /data-album-id="123"/, "artist album cards should expose the album id");
assert.match(html, /Nothing But The Beat/, "artist album card should render the album name");
assert.match(html, /\/cover\/grid\/cover\.jpg/, "artist album card should keep cover rendering");

console.log("frontend artist album view tests passed");
