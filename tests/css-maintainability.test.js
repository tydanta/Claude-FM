import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../public/styles.css", import.meta.url), "utf8");

assert.doesNotMatch(
  css,
  /}(?=body|\.|#|:root|\[)/,
  "styles.css should not glue adjacent selector blocks together without a newline"
);

for (const comment of [
  "核心布局：页面级主题变量和全局底色",
  "核心播放器：播放详情页歌词、时间轴和队列抽屉",
  "核心列表：歌单、歌手、专辑歌曲行的紧凑尺寸和按压反馈",
  "核心顶栏：固定顶部栏、搜索框和返回键统一位置",
  "核心移动端：窄屏播放器和首页播放卡片布局"
]) {
  assert.ok(css.includes(comment), `styles.css should document ${comment}`);
}

assert.doesNotMatch(
  css,
  /(^|[\s,{])\.topbar\b/,
  "legacy .topbar selectors should be removed after the fixed top chrome took over"
);

console.log("css maintainability tests passed");
