import assert from "node:assert/strict";
import {
  buildMockLyrics,
  getLyricIndexAt,
  isLyricCreditLine,
  mergeTranslatedLyrics,
  parseLyricText,
  parseLyricTime
} from "../public/modules/player/lyricsController.js";

assert.equal(parseLyricTime("01", "02", "3"), 62.3);
assert.equal(isLyricCreditLine("作词：某某"), true);
assert.equal(isLyricCreditLine("作词人：某某"), true);
assert.equal(isLyricCreditLine("作曲人：某某"), true);
assert.equal(isLyricCreditLine("Composer: someone"), true);
assert.equal(isLyricCreditLine("written by someone"), true);
assert.equal(isLyricCreditLine("真正歌词"), false);

assert.deepEqual(
  parseLyricText("[00:01.50][00:03.00]第一句\n作曲：某某\n[00:02]第二句"),
  [
    { time: 0, text: "作曲：某某", isCredit: true },
    { time: 1.5, text: "第一句", isCredit: false },
    { time: 2, text: "第二句", isCredit: false },
    { time: 3, text: "第一句", isCredit: false }
  ]
);

assert.deepEqual(
  parseLyricText('{"t":12000,"c":[{"tx":"JSON"},{"tx":"歌词"}]}'),
  [{ time: 12, text: "JSON歌词" }]
);

assert.deepEqual(
  parseLyricText("[10090,180](10090,60,0)I (10150,60,0)feel (10210,60,0)you"),
  [{ time: 10.09, text: "I feel you", isCredit: false }]
);

assert.deepEqual(
  mergeTranslatedLyrics(
    [{ time: 1, text: "hello" }, { time: 5, text: "same" }],
    [{ time: 1.6, text: "你好" }, { time: 5, text: "same" }]
  ),
  [
    { time: 1, text: "hello", translation: "你好" },
    { time: 5, text: "same", translation: "" }
  ]
);

const lyrics = [
  { time: 0, text: "a" },
  { time: 10, text: "b" },
  { time: 20, text: "c" }
];
assert.equal(getLyricIndexAt(0, lyrics), 0);
assert.equal(getLyricIndexAt(9.9, lyrics), 0);
assert.equal(getLyricIndexAt(10.19, lyrics), 1);
assert.equal(getLyricIndexAt(25, lyrics), 2);
assert.equal(getLyricIndexAt(5, []), -1);

assert.deepEqual(buildMockLyrics("x", { x: ["一", "二"] }), [
  { time: 0, text: "一", translation: "" },
  { time: 12, text: "二", translation: "" }
]);

console.log("frontend-lyrics-controller tests passed");
