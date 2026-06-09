import assert from "node:assert/strict";
import { getTrackArtists } from "../public/modules/netease/artistDisplay.js";

assert.deepEqual(
  getTrackArtists({
    artists: [
      { id: 1, name: " 周杰伦 " },
      { id: 2, name: "" },
      null
    ],
    artist: "fallback"
  }),
  [{ id: "1", name: "周杰伦" }]
);

assert.deepEqual(
  getTrackArtists({ artist: "A / B /  C", artistId: 99 }),
  [
    { id: "99", name: "A" },
    { id: "", name: "B" },
    { id: "", name: "C" }
  ]
);

assert.deepEqual(
  getTrackArtists({ artistId: "42" }),
  [{ id: "42", name: "未知歌手" }]
);

console.log("frontend-artist-display tests passed");
