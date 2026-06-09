import assert from "node:assert/strict";
import { createAndroidMediaSessionController } from "../public/modules/androidMediaSession.js";

const updates = [];
const listeners = {};
const plugin = {
  update(payload) {
    updates.push(payload);
    return Promise.resolve();
  },
  requestNotificationPermission() {
    return Promise.resolve();
  },
  addListener(eventName, callback) {
    listeners[eventName] = callback;
    return Promise.resolve({ remove() {} });
  }
};

const actions = [];
const controller = createAndroidMediaSessionController({
  plugin,
  getState: () => ({
    track: { title: "Hands", artist: "KonKid", album: "Single" },
    cover: "https://example.test/cover.jpg",
    liked: true,
    playing: true,
    position: 91.2,
    duration: 191.8
  }),
  controls: {
    previous: () => actions.push("previous"),
    play: () => actions.push("play"),
    pause: () => actions.push("pause"),
    playPause: () => actions.push("playPause"),
    next: () => actions.push("next"),
    like: () => actions.push("like")
  },
  setTimeoutFn: (callback) => {
    callback();
    return 1;
  },
  consoleRef: { warn() {} }
});

controller.bindAndroidMediaSessionEvents();
controller.syncAndroidMediaSession();

assert.equal(updates.length, 1);
assert.equal(updates[0].title, "Hands");
assert.equal(updates[0].positionMs, 91200);
assert.equal(updates[0].durationMs, 191800);
assert.equal(updates[0].liked, true);

listeners.mediaAction({ action: "previous" });
listeners.mediaAction({ action: "play" });
listeners.mediaAction({ action: "pause" });
listeners.mediaAction({ action: "playPause" });
listeners.mediaAction({ action: "next" });
listeners.mediaAction({ action: "like" });
assert.deepEqual(actions, ["previous", "play", "pause", "playPause", "next", "like"]);

console.log("frontend android media session controller tests passed");
