import assert from "node:assert/strict";
import { playAudioWithDiagnostics } from "../public/modules/player/audioPlayDiagnostics.js";

{
  let playCalls = 0;
  const audio = {
    async play() {
      playCalls += 1;
    }
  };
  await playAudioWithDiagnostics(audio);
  assert.equal(playCalls, 1);
}

{
  const logs = [];
  const notices = [];
  const error = new DOMException("play blocked", "NotAllowedError");
  const audio = {
    currentSrc: "http://127.0.0.1:3011/claude/media/audio?url=x",
    src: "http://127.0.0.1:3011/claude/media/audio?url=x",
    async play() {
      throw error;
    }
  };

  await assert.rejects(
    () => playAudioWithDiagnostics(audio, {
      logger: { error: (...args) => logs.push(args) },
      renderNotice: (message, options) => notices.push({ message, options }),
      context: { sourceId: "100", title: "Song" }
    }),
    /play blocked/
  );

  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "[ClaudeFM] audio.play failed");
  assert.equal(logs[0][1].name, "NotAllowedError");
  assert.equal(logs[0][1].sourceId, "100");
  assert.match(logs[0][1].src, /^http:\/\/127\.0\.0\.1:3011/);
  assert.deepEqual(notices, [{
    message: "系统拦截了自动播放，请再点一次播放按钮。",
    options: { key: "audio-play-error" }
  }]);
}

console.log("frontend-audio-play-diagnostics tests passed");
