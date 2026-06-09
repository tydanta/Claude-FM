import assert from "node:assert/strict";
import { createPlaybackProgressRuntimeController } from "../public/modules/player/playbackProgressRuntimeController.js";

function createElement() {
  return {
    style: {
      values: {},
      width: "",
      setProperty(name, value) {
        this.values[name] = value;
      }
    },
    textContent: "",
    value: ""
  };
}

function createHarness({ now = 1000, audio = {} } = {}) {
  const elements = {
    progress: createElement(),
    progressFill: createElement(),
    clawdWalker: createElement(),
    elapsed: createElement(),
    duration: createElement(),
    playerProgress: createElement(),
    playerProgressFill: createElement(),
    playerElapsed: createElement(),
    playerDuration: createElement()
  };
  const audioRef = {
    currentTime: 0,
    duration: 100,
    readyState: 2,
    paused: true,
    ended: false,
    ...audio
  };
  let durationValue = 100;
  let nowValue = now;
  const controller = createPlaybackProgressRuntimeController({
    elements,
    audio: audioRef,
    getPlayableDuration: () => durationValue,
    formatTime: (seconds) => `${Math.round(seconds)}s`,
    haveMetadata: 1,
    nowFn: () => nowValue
  });
  return {
    audio: audioRef,
    controller,
    elements,
    setDuration(value) {
      durationValue = value;
    },
    setNow(value) {
      nowValue = value;
    }
  };
}

{
  const { controller, elements } = createHarness();

  const viewState = controller.updateProgressUi(25, 100);

  assert.equal(viewState.sliderValue, "250");
  assert.equal(elements.progress.value, "250");
  assert.equal(elements.progressFill.style.width, "25%");
  assert.equal(elements.clawdWalker.style.values["--progress"], "25%");
  assert.equal(elements.elapsed.textContent, "25s");
  assert.equal(elements.playerProgress.value, "250");
  assert.equal(elements.playerProgressFill.style.width, "25%");
  assert.equal(elements.playerElapsed.textContent, "25s");
}

{
  const { audio, controller, elements } = createHarness();

  controller.requestAudioSeek(40, { user: true });

  assert.equal(audio.currentTime, 40);
  assert.deepEqual(controller.getPendingSeekState(), {
    pendingSeekTime: 0,
    pendingUserSeekTime: null,
    pendingUserSeekUntil: 0,
    suppressProgressSyncUntil: 1900
  });
  assert.equal(elements.progress.value, "400");
}

{
  const { audio, controller, setNow } = createHarness({ audio: { readyState: 0 } });

  controller.requestAudioSeek(30, { user: true });
  audio.currentTime = 10;
  controller.syncPlayerProgress();

  assert.equal(controller.getPendingSeekState().pendingUserSeekTime, 30);
  assert.equal(controller.getPendingSeekState().pendingUserSeekUntil, 13000);
  assert.equal(controller.getPendingSeekState().suppressProgressSyncUntil, 1900);

  setNow(14000);
  controller.syncPlayerProgress();

  assert.equal(controller.getPendingSeekState().pendingUserSeekTime, null);
}

{
  const { controller } = createHarness();

  controller.requestAudioSeek(15);
  assert.equal(controller.getPendingSeekState().pendingSeekTime, 0);

  controller.requestAudioSeek(20, { user: true });
  controller.resetPendingSeek({ includeUser: true });
  assert.deepEqual(controller.getPendingSeekState(), {
    pendingSeekTime: 0,
    pendingUserSeekTime: null,
    pendingUserSeekUntil: 0,
    suppressProgressSyncUntil: 0
  });
}

console.log("frontend-playback-progress-runtime-controller tests passed");
