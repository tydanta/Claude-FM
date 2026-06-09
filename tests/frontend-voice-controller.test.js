import assert from "node:assert/strict";
import {
  createVoiceController,
  createMusicDucker,
  resolveVoiceHighlightOptions
} from "../public/modules/claudio/voiceController.js";

const audio = { volume: 0.8 };
const ducker = createMusicDucker({ audio });
ducker.duckMusicVolume();
assert.ok(Math.abs(audio.volume - 0.28) < 0.000001);
ducker.duckMusicVolume();
assert.ok(Math.abs(audio.volume - 0.28) < 0.000001);
ducker.restoreMusicVolume();
assert.equal(audio.volume, 0.8);

assert.deepEqual(
  resolveVoiceHighlightOptions({
    segmentIndex: 2,
    chunkHighlights: [{ segmentIndex: 8 }],
    currentChunkIndex: 0
  }),
  { segmentIndex: 8 }
);

const highlightedLines = [];
function createHighlightLine(index) {
  const classes = new Set();
  const props = new Map();
  return {
    index,
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
      contains: (name) => classes.has(name)
    },
    style: {
      setProperty: (name, value) => props.set(name, value),
      removeProperty: (name) => props.delete(name)
    },
    getProgress: () => props.get("--voice-progress"),
    isSpeaking: () => classes.has("is-speaking")
  };
}

const lines = [createHighlightLine(0), createHighlightLine(1)];
let intervalCallback = null;
const selectors = [];
const documentRef = {
  querySelectorAll(selector) {
    selectors.push(selector);
    if (selector === ".voice-progress-highlight") {
      highlightedLines.push(selector);
      return lines;
    }
    if (selector === ".voice-progress-highlight.is-speaking") return lines.filter((line) => line.isSpeaking());
    return [];
  }
};
const voiceAudio = {
  paused: false,
  duration: 4,
  currentTime: 1,
  pause() {},
  removeAttribute() {},
  play: () => Promise.resolve()
};
const controller = createVoiceController({
  audio: { volume: 1, paused: false },
  voiceAudio,
  speakDjBtn: null,
  djLine: { textContent: "" },
  chatLog: { dataset: {} },
  getVoiceForText: async () => ({ audioUrl: "" }),
  getPreparedVoiceFromUrl: async () => ({ audioUrl: "" }),
  getVoiceCache: () => null,
  appendChatMessage: () => {},
  renderClaudioNotice: () => {},
  documentRef,
  windowRef: {
    setInterval: (callback) => {
      intervalCallback = callback;
      return 1;
    },
    clearInterval: () => {},
    setTimeout: () => {},
    speechSynthesis: { cancel() {} }
  },
  performanceRef: { now: () => 0 }
});

controller.startWordHighlight(4000, { segmentIndex: 1, audioEl: voiceAudio });
assert.ok(highlightedLines.length >= 1);
assert.equal(selectors.includes(".insight-word"), false);
assert.equal(selectors.includes(".insight-word.is-speaking"), false);
assert.equal(typeof intervalCallback, "function");
intervalCallback();
assert.equal(lines[0].isSpeaking(), false);
assert.equal(lines[1].isSpeaking(), true);
assert.equal(lines[1].getProgress(), "25%");

console.log("frontend-voice-controller tests passed");
