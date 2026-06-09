import { syncPlayButtonView } from "./playerView.js";

export function createPlaybackControlSurfaceRuntimeController({
  elements = {},
  audio,
  saveState = async () => {}
} = {}) {
  function syncPlayUi() {
    syncPlayButtonView({
      body: elements.body,
      walker: elements.clawdWalker,
      playButton: elements.playBtn,
      playerPlayButton: elements.playerPlayBtn
    }, !audio?.paused);
  }

  function bindPlaybackControlSurfaceEvents() {
    elements.volume?.addEventListener("input", async () => {
      audio.volume = Number(elements.volume.value);
      await saveState({ volume: audio.volume });
    });
  }

  return {
    bindPlaybackControlSurfaceEvents,
    syncPlayUi
  };
}
