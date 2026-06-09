import assert from "node:assert/strict";
import { createEqualizerRuntimeController } from "../public/modules/player/equalizerRuntimeController.js";

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

function createBar() {
  return {
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      }
    }
  };
}

function createEqualizer() {
  const equalizer = {
    classList: createClassList(),
    bars: [],
    _innerHTML: "",
    set innerHTML(value) {
      this._innerHTML = value;
      const count = (value.match(/class="eq-bar"/g) || []).length;
      this.bars = Array.from({ length: count }, createBar);
    },
    get innerHTML() {
      return this._innerHTML;
    },
    querySelectorAll(selector) {
      return selector === ".eq-bar" ? this.bars : [];
    }
  };
  return equalizer;
}

function createHarness({ audio = {}, windowRef = {} } = {}) {
  const calls = {
    cancelled: [],
    warnings: []
  };
  const equalizer = createEqualizer();
  let nextFrameId = 10;
  const controller = createEqualizerRuntimeController({
    elements: { equalizer },
    audio: {
      paused: false,
      ended: false,
      readyState: 4,
      ...audio
    },
    windowRef: {
      setTimeout() {},
      requestAnimationFrame(handler) {
        nextFrameId += 1;
        return nextFrameId;
      },
      cancelAnimationFrame(id) {
        calls.cancelled.push(id);
      },
      ...windowRef
    },
    consoleRef: {
      warn(...args) {
        calls.warnings.push(args);
      }
    }
  });
  return { calls, controller, equalizer };
}

{
  const { controller, equalizer } = createHarness();

  controller.buildEqualizer();

  assert.equal(equalizer.bars.length, 90);
  assert.equal(equalizer.classList.contains("is-hidden"), true);

  controller.setEqualizerHeights(7);
  assert.equal(equalizer.bars[0].style.values["--h"], "7");
  assert.equal(equalizer.bars.at(-1).style.values["--h"], "7");
}

{
  class AudioContext {
    constructor() {
      this.destination = {};
      this.state = "running";
    }

    createMediaElementSource() {
      return { connect() {} };
    }

    createAnalyser() {
      return {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 4,
        connect() {},
        getByteFrequencyData(data) {
          data.set([0, 64, 128, 255]);
        }
      };
    }
  }
  const { calls, controller, equalizer } = createHarness({ windowRef: { AudioContext } });

  controller.buildEqualizer();
  assert.equal(await controller.initAudioAnalyser(), true);
  controller.setEqualizerHeights(9);
  controller.renderEqualizerFrame(controller.getStartToken());
  const frameId = controller.getState().frame;
  assert.ok(frameId > 0);

  controller.stopEqualizer({ hide: true });

  assert.deepEqual(calls.cancelled, [frameId]);
  assert.equal(controller.getState().frame, 0);
  assert.equal(equalizer.bars[0].style.values["--h"], "0");
  assert.equal(equalizer.classList.contains("is-hidden"), true);
}

{
  const { controller, equalizer } = createHarness({
    windowRef: {
      AudioContext: class AudioContext {
        constructor() {
          throw new Error("should not create AudioContext during startEqualizer");
        }
      }
    }
  });

  controller.buildEqualizer();
  await controller.startEqualizer();

  assert.equal(equalizer.classList.contains("is-hidden"), true);
  assert.equal(controller.getState().startToken, 1);
}

{
  const { controller } = createHarness({ windowRef: { AudioContext: null, webkitAudioContext: null } });

  controller.buildEqualizer();
  const ready = await controller.initAudioAnalyser();

  assert.equal(ready, false);
  assert.equal(controller.getState().unavailable, true);
}

console.log("frontend-equalizer-runtime-controller tests passed");
