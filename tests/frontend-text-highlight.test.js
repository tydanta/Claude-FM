import assert from "node:assert/strict";
import { tokenizeForHighlight } from "../public/modules/chat/textHighlight.js";

const withoutSegmenter = { intlRef: null };

assert.deepEqual(
  tokenizeForHighlight("", withoutSegmenter),
  []
);
assert.deepEqual(tokenizeForHighlight(null, withoutSegmenter), []);

assert.deepEqual(
  tokenizeForHighlight("Hi, Claudio!", withoutSegmenter),
  [
    { text: "Hi", highlight: true },
    { text: ",", highlight: false },
    { text: " ", highlight: false },
    { text: "Claudio", highlight: true },
    { text: "!", highlight: false }
  ]
);

assert.deepEqual(
  tokenizeForHighlight("今天想听歌。", withoutSegmenter),
  [
    { text: "今", highlight: true },
    { text: "天", highlight: true },
    { text: "想", highlight: true },
    { text: "听", highlight: true },
    { text: "歌", highlight: true },
    { text: "。", highlight: false }
  ]
);

assert.deepEqual(
  tokenizeForHighlight("天气 ok", withoutSegmenter),
  [
    { text: "天", highlight: true },
    { text: "气", highlight: true },
    { text: " ", highlight: false },
    { text: "ok", highlight: true }
  ]
);

{
  class FakeSegmenter {
    segment() {
      return [
        { segment: "今天真好" },
        { segment: "，" },
        { segment: "ok" }
      ];
    }
  }

  assert.deepEqual(
    tokenizeForHighlight("ignored", { intlRef: { Segmenter: FakeSegmenter } }),
    [
      { text: "今天", highlight: true },
      { text: "真好", highlight: true },
      { text: "，", highlight: false },
      { text: "ok", highlight: true }
    ]
  );
}

console.log("frontend-text-highlight tests passed");
