import assert from "node:assert/strict";
import { createPlaybackControlSurfaceRuntimeController } from "../public/modules/player/playbackControlSurfaceRuntimeController.js";

function createClassList() {
  return {
    values: new Set(),
    toggle(name, active) {
      if (active) this.values.add(name);
      else this.values.delete(name);
    },
    contains(name) {
      return this.values.has(name);
    }
  };
}

function createElement() {
  const listeners = {};
  return {
    attributes: {},
    classList: createClassList(),
    listeners,
    title: "",
    value: "",
    addEventListener(name, handler) {
      listeners[name] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

{
  const body = createElement();
  const clawdWalker = createElement();
  const playBtn = createElement();
  const playerPlayBtn = createElement();
  const audio = { paused: false };
  const controller = createPlaybackControlSurfaceRuntimeController({
    elements: { body, clawdWalker, playBtn, playerPlayBtn },
    audio
  });

  controller.syncPlayUi();

  assert.equal(body.classList.contains("is-playing"), true);
  assert.equal(clawdWalker.classList.contains("is-idle"), false);
  assert.equal(playBtn.attributes["aria-label"], "暂停");
  assert.equal(playerPlayBtn.title, "暂停");

  audio.paused = true;
  controller.syncPlayUi();

  assert.equal(body.classList.contains("is-playing"), false);
  assert.equal(clawdWalker.classList.contains("is-idle"), true);
  assert.equal(playBtn.attributes["aria-label"], "播放");
}

{
  const volume = createElement();
  volume.value = "0.42";
  const audio = { volume: 1, paused: true };
  const saved = [];
  const controller = createPlaybackControlSurfaceRuntimeController({
    elements: { volume },
    audio,
    saveState: async (payload) => {
      saved.push(payload);
    }
  });

  controller.bindPlaybackControlSurfaceEvents();
  await volume.listeners.input();

  assert.equal(audio.volume, 0.42);
  assert.deepEqual(saved, [{ volume: 0.42 }]);
}

console.log("frontend-playback-control-surface-runtime-controller tests passed");
