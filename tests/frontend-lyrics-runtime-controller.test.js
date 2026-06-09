import assert from "node:assert/strict";
import { createLyricsRuntimeController } from "../public/modules/player/lyricsRuntimeController.js";
import {
  getLyricIndexAt,
  mergeTranslatedLyrics,
  parseLyricText
} from "../public/modules/player/lyricsController.js";

function createElement() {
  return {
    dataset: {},
    innerHTML: "",
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
}

function createClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    remove(value) {
      values.delete(value);
    },
    toggle(value, force) {
      if (force) values.add(value);
      else values.delete(value);
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function createStyleDeclaration() {
  return {
    values: {},
    setProperty(name, value) {
      this.values[name] = value;
    },
    getPropertyValue(name) {
      return this.values[name] || "";
    },
    removeProperty(name) {
      delete this.values[name];
    }
  };
}

function createPlayerLyricsElement({ itemHeight = 40, clientHeight = 100, containerTop = 0 } = {}) {
  let html = "";
  const track = {
    classList: createClassList(),
    style: createStyleDeclaration(),
    scrollHeight: 0
  };
  const element = {
    dataset: {},
    classList: createClassList(),
    style: createStyleDeclaration(),
    scrollTop: 0,
    scrollCalls: [],
    clientHeight,
    scrollHeight: 0,
    items: [],
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = String(value || "");
      const indexes = [...html.matchAll(/data-player-lyric-index="(\d+)"/g)].map((match) => Number(match[1]));
      element.items = indexes.map((index) => ({
        dataset: { playerLyricIndex: String(index) },
        offsetTop: containerTop + index * itemHeight,
        offsetHeight: itemHeight,
        classList: createClassList(),
        getBoundingClientRect() {
          const offset = Number.parseFloat(element.style.getPropertyValue("--player-lyric-offset") || "0") || 0;
          const top = containerTop + index * itemHeight - element.scrollTop - offset;
          return {
            top,
            bottom: top + itemHeight,
            height: itemHeight
          };
        }
      }));
      element.scrollHeight = element.items.length * itemHeight;
      track.scrollHeight = element.scrollHeight;
    },
    getBoundingClientRect() {
      return {
        top: containerTop,
        bottom: containerTop + clientHeight,
        height: clientHeight
      };
    },
    scrollTo(options = {}) {
      element.scrollCalls.push(options);
      element.scrollTop = Number(options.top || 0);
    },
    querySelector(selector) {
      if (selector === ".player-lyric-track") {
        return html.includes("player-lyric-track") ? track : null;
      }
      const match = String(selector || "").match(/data-player-lyric-index="(\d+)"/);
      if (match) return element.items.find((item) => item.dataset.playerLyricIndex === match[1]) || null;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".player-lyric-item" || selector.includes("data-player-lyric-index")) {
        return element.items;
      }
      if (selector === ".player-lyric-item.is-preview") {
        return element.items.filter((item) => item.classList.contains("is-preview"));
      }
      return [];
    }
  };
  return element;
}

function createLyricLineElement() {
  const scroll = {
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      }
    }
  };
  return {
    dataset: {},
    innerHTML: "",
    querySelector(selector) {
      return selector === ".lyric-scroll" ? scroll : null;
    },
    querySelectorAll(selector) {
      return selector === ".lyric-item" ? [] : [];
    }
  };
}

{
  const apiCalls = [];
  const lyricLine = createElement();
  const playerLyrics = createElement();
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    api: async (path) => {
      apiCalls.push(path);
      throw new Error("desktop lyrics api should not be used");
    },
    neteaseApi: {
      getLyrics: async ({ songId }) => ({
        lyric: `[00:01.00]Song ${songId}`,
        translatedLyric: "[00:01.00]Translated"
      })
    },
    parseLyricText: (text) => text
      .split("\n")
      .filter(Boolean)
      .map((line) => ({
        time: Number(line.match(/\[00:(\d+)\.00\]/)?.[1] || 0),
        text: line.replace(/\[[^\]]+\]/, "")
      })),
    mergeTranslatedLyrics: (lines, translated) => lines.map((line, index) => ({
      ...line,
      translation: translated[index]?.text || ""
    })),
    getLyricIndexAt: () => 0,
    documentRef: { body: { dataset: {} } },
    requestAnimationFrameFn: () => 1,
    cancelAnimationFrameFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-100", source: "netease", sourceId: "100" });

  assert.deepEqual(apiCalls, []);
  assert.equal(controller.getActiveLyrics()[0].text, "Song 100");
  assert.equal(controller.getActiveLyrics()[0].translation, "Translated");
}

{
  let resolveSecondLyrics;
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement();
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio: { currentTime: 0 },
    neteaseApi: {
      getLyrics: async ({ songId }) => {
        if (songId === "first") {
          return { lyric: "[01:10.00]stale previous lyric", translatedLyric: "" };
        }
        return new Promise((resolve) => {
          resolveSecondLyrics = () => resolve({ lyric: "[00:00.00]fresh next lyric", translatedLyric: "" });
        });
      }
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    requestAnimationFrameFn: () => 1,
    cancelAnimationFrameFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-first", source: "netease", sourceId: "first" });
  assert.equal(controller.getActiveLyrics()[0].text, "stale previous lyric");

  const pendingLoad = controller.loadLyricsForTrack({ id: "netease-second", source: "netease", sourceId: "second" });

  assert.equal(controller.getActiveLyricTrackId(), "netease-second");
  assert.equal(controller.getActiveLyrics().length, 0);
  assert.equal(playerLyrics.dataset.lyricTrackId, "");
  assert.doesNotMatch(playerLyrics.innerHTML, /stale previous lyric/);

  resolveSecondLyrics();
  await pendingLoad;

  assert.equal(controller.getActiveLyrics()[0].text, "fresh next lyric");
}

{
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement();
  const audio = { currentTime: 90 };
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio,
    neteaseApi: {
      getLyrics: async () => ({
        lyric: "[01:30.00]late ordinary lyric",
        yrcLyric: [
          "[10000,300](10000,150,0)early (10150,150,0)line",
          "[50000,300](50000,300,0)middle line",
          "[90000,300](90000,300,0)late line",
          "[120000,300](120000,300,0)ending line"
        ].join("\n"),
        translatedLyric: ""
      })
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    performanceRef: { now: () => 0 },
    requestAnimationFrameFn: (callback) => {
      callback(620);
      return 1;
    },
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-yrc", source: "netease", sourceId: "yrc" });

  assert.equal(controller.getActiveLyrics()[0].text, "early line");
  assert.equal(controller.getActiveLyrics()[0].time, 10);
  assert.equal(controller.getActiveLyricIndex(), 2);
  assert.match(playerLyrics.innerHTML, /player-lyric-track/);
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "50px");
}

{
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement({ containerTop: 300 });
  const audio = { currentTime: 90 };
  const animationFrames = [];
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio,
    neteaseApi: {
      getLyrics: async () => ({
        lyric: [
          "[00:10.00]early line",
          "[00:50.00]middle line",
          "[01:30.00]current line",
          "[02:00.00]ending line"
        ].join("\n"),
        translatedLyric: ""
      })
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    performanceRef: { now: () => 0 },
    requestAnimationFrameFn: (callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    },
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-offset", source: "netease", sourceId: "offset" });

  assert.equal(controller.getActiveLyricIndex(), 2);
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "50px");

  controller.handlePlayerLyricsPointerInteraction();
  assert.equal(playerLyrics.scrollTop, 50);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "0px");
  assert.equal(playerLyrics.dataset.previewLyricIndex, "2");
}

{
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement({ containerTop: 300 });
  const audio = { currentTime: 90 };
  const animationFrames = [];
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio,
    neteaseApi: {
      getLyrics: async () => ({
        lyric: [
          "[00:10.00]early line",
          "[00:50.00]middle line",
          "[01:30.00]current line",
          "[02:00.00]next line",
          "[02:30.00]later line",
          "[03:00.00]ending line"
        ].join("\n"),
        translatedLyric: ""
      })
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    performanceRef: { now: () => 0 },
    requestAnimationFrameFn: (callback) => {
      animationFrames.push(callback);
      return animationFrames.length;
    },
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-smooth", source: "netease", sourceId: "smooth" });
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "50px");
  animationFrames.length = 0;

  audio.currentTime = 120;
  controller.renderLyric("netease-smooth");

  assert.equal(playerLyrics.scrollCalls.length, 0);
  assert.equal(animationFrames.length, 0);
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "90px");

  audio.currentTime = 90;
  controller.renderLyric("netease-smooth");

  assert.equal(animationFrames.length, 0);
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "50px");
}

{
  let lyricRequestCount = 0;
  const controller = createLyricsRuntimeController({
    elements: { lyricLine: createLyricLineElement(), playerLyrics: createPlayerLyricsElement() },
    audio: { currentTime: 0 },
    neteaseApi: {
      getLyrics: async ({ refresh }) => {
        lyricRequestCount += 1;
        return {
          lyric: refresh
            ? "[00:07.00]fresh first line\n[01:18.00]late line"
            : "[01:18.00]stale late line",
          translatedLyric: ""
        };
      }
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    requestAnimationFrameFn: () => 1,
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-refresh", source: "netease", sourceId: "refresh" });

  assert.equal(lyricRequestCount, 2);
  assert.equal(controller.getActiveLyrics()[0].text, "fresh first line");
}

{
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement({ itemHeight: 40, clientHeight: 120, containerTop: 280 });
  playerLyrics.scrollTop = 1200;
  const audio = { currentTime: 16 };
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio,
    neteaseApi: {
      getLyrics: async () => ({
        lyric: [
          "[00:07.00]first full lyric",
          "[00:15.00]current early lyric",
          "[00:22.00]third lyric",
          "[00:30.00]fourth lyric",
          "[00:38.00]fifth lyric",
          "[00:46.00]sixth lyric",
          "[00:54.00]seventh lyric",
          "[01:02.00]one minute lyric",
          "[01:10.00]later lyric",
          "[01:18.00]later still"
        ].join("\n"),
        translatedLyric: ""
      })
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    requestAnimationFrameFn: () => 1,
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-long", source: "netease", sourceId: "long" });

  assert.equal(controller.getActiveLyrics()[0].text, "first full lyric");
  assert.equal(controller.getActiveLyricIndex(), 1);
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "0px");
  assert.equal(playerLyrics.scrollCalls.length, 0);
}

{
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement({ itemHeight: 40, clientHeight: 120, containerTop: 280 });
  const audio = { currentTime: 92 };
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio,
    neteaseApi: {
      getLyrics: async () => ({
        lyric: [
          "[00:00.00]zero lyric",
          "[00:08.00]first early lyric",
          "[00:16.00]second early lyric",
          "[00:24.00]third early lyric",
          "[00:32.00]fourth early lyric",
          "[00:40.00]fifth early lyric",
          "[00:48.00]sixth early lyric",
          "[00:56.00]seventh early lyric",
          "[01:04.00]one minute lyric",
          "[01:12.00]later lyric",
          "[01:20.00]later still",
          "[01:28.00]current lyric",
          "[01:36.00]next lyric"
        ].join("\n"),
        translatedLyric: ""
      })
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    performanceRef: { now: () => 0 },
    requestAnimationFrameFn: (callback) => {
      callback(620);
      return 1;
    },
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-open-top", source: "netease", sourceId: "open-top" });
  assert.equal(controller.getActiveLyricIndex(), 11);
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "400px");

  playerLyrics.scrollTop = 900;
  controller.syncPlayerLyrics({ anchor: "start" });

  assert.equal(controller.getActiveLyrics()[0].text, "zero lyric");
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "400px");
  assert.equal(playerLyrics.scrollCalls.length, 0);

  controller.renderLyric("netease-open-top");
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "400px");
  assert.equal(playerLyrics.scrollCalls.length, 0);

  audio.currentTime = 97;
  controller.renderLyric("netease-open-top");
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "400px");
  assert.equal(playerLyrics.scrollCalls.length, 0);
}

{
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement({ itemHeight: 40, clientHeight: 120, containerTop: 280 });
  const audio = { currentTime: 78 };
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio,
    neteaseApi: {
      getLyrics: async () => ({
        lyric: [
          "[00:00.00]credit",
          "[00:07.00]first lyric",
          "[01:18.00]stale previous time lyric"
        ].join("\n"),
        translatedLyric: ""
      })
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    requestAnimationFrameFn: () => 1,
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  controller.setLyricClockOverride(0);
  await controller.loadLyricsForTrack({ id: "netease-stale-clock", source: "netease", sourceId: "stale-clock" });

  assert.equal(controller.getActiveLyricIndex(), 0);
  assert.equal(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "0px");

  controller.clearLyricClockOverride();
  controller.renderLyric("netease-stale-clock");

  assert.equal(controller.getActiveLyricIndex(), 2);
}

{
  const lyricLine = createLyricLineElement();
  const playerLyrics = createPlayerLyricsElement({ itemHeight: 40, clientHeight: 120, containerTop: 280 });
  const audio = { currentTime: 92 };
  const controller = createLyricsRuntimeController({
    elements: { lyricLine, playerLyrics },
    audio,
    neteaseApi: {
      getLyrics: async () => ({
        lyric: [
          "[00:00.00]zero lyric",
          "[00:10.00]ten lyric",
          "[00:20.00]twenty lyric",
          "[00:30.00]thirty lyric",
          "[00:40.00]forty lyric",
          "[00:50.00]fifty lyric",
          "[01:00.00]sixty lyric",
          "[01:10.00]seventy lyric",
          "[01:20.00]eighty lyric",
          "[01:30.00]ninety lyric",
          "[01:40.00]hundred lyric"
        ].join("\n"),
        translatedLyric: ""
      })
    },
    parseLyricText,
    mergeTranslatedLyrics,
    getLyricIndexAt,
    documentRef: { body: { dataset: { page: "player" } } },
    performanceRef: { now: () => 0 },
    requestAnimationFrameFn: (callback) => {
      callback(620);
      return 1;
    },
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: () => 1,
    clearTimeoutFn: () => {}
  });

  await controller.loadLyricsForTrack({ id: "netease-manual-edge", source: "netease", sourceId: "manual-edge" });
  assert.equal(playerLyrics.scrollTop, 0);
  assert.notEqual(playerLyrics.style.values["--player-lyric-offset"], "0px");

  controller.handlePlayerLyricsPointerInteraction();

  assert.notEqual(playerLyrics.scrollTop, 0);
  assert.equal(playerLyrics.style.values["--player-lyric-offset"], "0px");
  assert.ok(controller.getPlayerLyricUserScrollUntil() > 0);

  playerLyrics.scrollTop = Math.max(0, playerLyrics.scrollHeight - playerLyrics.clientHeight);
  const bottomScrollTop = playerLyrics.scrollTop;
  controller.handlePlayerLyricsPointerInteraction();

  assert.equal(playerLyrics.scrollTop, bottomScrollTop);
}

console.log("frontend-lyrics-runtime-controller tests passed");


