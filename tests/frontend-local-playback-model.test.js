import assert from "node:assert/strict";
import { createLocalPlaybackModel } from "../public/modules/player/localPlaybackModel.js";

{
  const model = createLocalPlaybackModel(null);
  assert.equal(model.state.volume, 0.8);
  assert.equal(model.state.position, 0);
  assert.deepEqual(model.weather, { tempC: "--", summary: "clear" });
  assert.deepEqual(model.integrations, {});
  assert.deepEqual(model.queue, []);
}

{
  const model = createLocalPlaybackModel({
    state: { volume: 0.4, playback: { trackId: "old" } },
    weather: { tempC: 22, summary: "rain" },
    queue: [{ id: "a" }],
    djLine: "ready"
  });
  assert.equal(model.state.volume, 0.4);
  assert.equal(model.state.playback.trackId, "old");
  assert.equal(model.weather.tempC, 22);
  assert.equal(model.queue.length, 1);
  assert.equal(model.djLine, "ready");
}

console.log("frontend-local-playback-model tests passed");
