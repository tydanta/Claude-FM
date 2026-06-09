import assert from "node:assert/strict";
import {
  buildProgressViewState,
  getModeButtonView,
  getTrackCoverBackground,
  renderQueueModeControls,
  syncModeButtonView,
  syncPlayButtonView,
  syncProgressView
} from "../public/modules/player/playerView.js";

function createElement() {
  return {
    attributes: {},
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      }
    },
    dataset: {},
    style: {
      values: {},
      width: "",
      setProperty(name, value) {
        this.values[name] = value;
      }
    },
    textContent: "",
    title: "",
    value: "",
    child: null,
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    querySelector(selector) {
      return selector === "span" ? this.child : null;
    }
  };
}

{
  const state = buildProgressViewState(25, 100, (seconds) => `${seconds}s`);
  assert.deepEqual(state, {
    sliderValue: "250",
    percent: 25,
    percentText: "25%",
    progressRatio: "0.25",
    elapsedText: "25s",
    durationText: "100s"
  });
}

{
  const progress = createElement();
  const progressFill = createElement();
  const walker = createElement();
  const elapsed = createElement();
  syncProgressView({
    progressInput: progress,
    progressFill,
    walker,
    elapsedLabel: elapsed
  }, { currentTime: 12, durationValue: 48, formatTime: (seconds) => `${seconds}s` });

  assert.equal(progress.value, "250");
  assert.equal(progressFill.style.width, "25%");
  assert.equal(walker.style.values["--progress"], "25%");
  assert.equal(walker.style.values["--progress-ratio"], "0.25");
  assert.equal(elapsed.textContent, "12s");
}

{
  const modeView = getModeButtonView("loop");
  assert.equal(modeView.id, "loop");
  assert.equal(modeView.icon, "/icons/loop.svg");
  assert.equal(modeView.ariaLabel, "播放模式：循环播放");

  const button = createElement();
  button.child = createElement();
  syncModeButtonView(button, "single");
  assert.equal(button.dataset.mode, "single");
  assert.equal(button.dataset.modeIcon, "/icons/repeatsingle.svg");
  assert.equal(button.attributes["aria-label"], "播放模式：单曲循环");
  assert.equal(button.title, "单曲循环");
  assert.equal(button.child.attributes["aria-label"], "单曲循环");
  assert.equal(button.child.textContent, "");
  assert.equal(button.child.style.values["--mode-icon"], "url(\"/icons/repeatsingle.svg\")");
}

assert.match(renderQueueModeControls("random", "player"), /data-player-queue-mode/);
assert.match(renderQueueModeControls("random", "player"), /\/icons\/random\.svg/);
assert.doesNotMatch(renderQueueModeControls("random", "player"), />随机播放</);
assert.match(renderQueueModeControls("bad", "home"), /\/icons\/order\.svg/);
assert.doesNotMatch(renderQueueModeControls("bad", "home"), />顺序播放</);

{
  const body = createElement();
  const walker = createElement();
  const homeButton = createElement();
  const playerButton = createElement();
  syncPlayButtonView({ body, walker, playButton: homeButton, playerPlayButton: playerButton }, true);
  assert.equal(body.classList.contains("is-playing"), true);
  assert.equal(walker.classList.contains("is-idle"), false);
  assert.equal(homeButton.attributes["aria-label"], "暂停");
  assert.equal(playerButton.title, "暂停");
}

assert.equal(getTrackCoverBackground({ cover: "https://img" }, (url, size) => `${url}?${size}`, "player"), "url(\"https://img?player\")");
assert.equal(getTrackCoverBackground({}, (url) => url), "");

console.log("frontend-player-view tests passed");
