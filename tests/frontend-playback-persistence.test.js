import assert from "node:assert/strict";
import {
  buildNowPayloadFromPlaybackPayload,
  buildPlaybackPayload,
  createPlaybackPersistence,
  getPlaybackPlaylist,
  readStoredPlaybackPayload
} from "../public/modules/player/playbackPersistence.js";

const activePlaylist = {
  id: "p1",
  source: "netease",
  sourceId: "remote-1",
  title: "Playlist",
  subtitle: "Sub",
  description: "Desc",
  cover: "cover.jpg",
  trackCount: 12,
  tracks: [{ id: "a" }]
};

assert.deepEqual(getPlaybackPlaylist({ activePlaylist, model: { queue: [] } }), {
  id: "p1",
  source: "netease",
  sourceId: "remote-1",
  title: "Playlist",
  subtitle: "Sub",
  description: "Desc",
  cover: "cover.jpg",
  trackCount: 12
});

assert.deepEqual(getPlaybackPlaylist({
  activePlaylist: null,
  model: {
    queue: [{ id: "1" }, { id: "2" }],
    state: { playback: { playlist: { id: "old", sourceId: "remote-old", title: "Old" } } }
  }
}), {
  id: "old",
  source: "netease",
  sourceId: "remote-old",
  title: "Old",
  subtitle: "",
  description: "",
  cover: "",
  trackCount: 2
});

const payload = buildPlaybackPayload({
  model: {
    track: { id: "t1", title: "Track" },
    queue: [{ id: "t1" }],
    state: { position: 4 }
  },
  activePlaylist,
  audio: { currentTime: 15.2, paused: false },
  duration: 180,
  pendingUserSeekTime: 32.4,
  pendingUserSeekUntil: Date.now() + 1000
});
assert.equal(payload.position, 32.4);
assert.equal(payload.duration, 180);
assert.equal(payload.isPlaying, true);
assert.equal(payload.playlist.id, "p1");

{
  const newTrackPayload = buildPlaybackPayload({
    model: {
      track: { id: "t2", title: "New Track" },
      queue: [{ id: "t2" }],
      state: { position: 0 }
    },
    activePlaylist,
    audio: { currentTime: 78, paused: true },
    duration: 180,
    clockOverrideTime: 0
  });

  assert.equal(newTrackPayload.position, 0);
}

{
  const storedPayload = readStoredPlaybackPayload((key) =>
    key === "claudio-playback-payload" ? JSON.stringify(payload) : ""
  );
  assert.equal(storedPayload.track.id, "t1");

  const restoredNow = buildNowPayloadFromPlaybackPayload(storedPayload, {
    weather: { tempC: 20, summary: "rain" },
    schedule: [{ title: "meeting" }]
  });

  assert.equal(restoredNow.track.id, "t1");
  assert.equal(restoredNow.queue.length, 1);
  assert.equal(restoredNow.state.position, 0);
  assert.equal(restoredNow.state.playback.position, 0);
  assert.equal(restoredNow.state.playback.playlist.title, "Playlist");
  assert.equal(restoredNow.weather.summary, "rain");
  assert.equal(restoredNow.schedule[0].title, "meeting");
}

assert.equal(readStoredPlaybackPayload(() => "{bad json"), null);
assert.equal(buildNowPayloadFromPlaybackPayload(null), null);

const apiCalls = [];
const timeouts = [];
const beacons = [];
const persistence = createPlaybackPersistence({
  api: (path, options) => {
    apiCalls.push({ path, options });
    return Promise.resolve();
  },
  navigatorRef: {
    sendBeacon(path, blob) {
      beacons.push({ path, blob });
      return true;
    }
  },
  windowRef: {
    Blob,
    clearTimeout(id) {
      if (id) id.cleared = true;
    },
    setTimeout(callback, delay) {
      const id = { callback, delay, cleared: false };
      timeouts.push(id);
      return id;
    }
  },
  getPayload: () => payload,
  getRemoteCapabilityBaseUrl: () => ""
});

persistence.persist();
persistence.persist();
assert.equal(timeouts.length, 1);
assert.equal(timeouts[0].delay, 350);
timeouts[0].callback();
assert.equal(apiCalls.length, 1);
assert.equal(apiCalls[0].path, "/api/playback");

persistence.persist({ immediate: true });
assert.equal(beacons.length, 1);
assert.equal(beacons[0].path, "/api/playback");

await persistence.saveState({ isPlaying: false });
assert.equal(apiCalls[1].path, "/api/state");
assert.equal(apiCalls[1].options.body, JSON.stringify({ isPlaying: false }));

{
  const localWrites = [];
  const localApiCalls = [];
  const localBeacons = [];
  const androidPersistence = createPlaybackPersistence({
    api: (path, options) => {
      localApiCalls.push({ path, options });
      return Promise.resolve();
    },
    navigatorRef: {
      sendBeacon(path, blob) {
        localBeacons.push({ path, blob });
        return true;
      }
    },
    windowRef: {
      Blob,
      clearTimeout() {},
      setTimeout(callback) {
        callback();
        return 1;
      }
    },
    getPayload: () => payload,
    getRemoteCapabilityBaseUrl: () => "",
    isLocalPlaybackRuntime: () => true,
    writeStorage: (key, value) => localWrites.push({ key, value })
  });

  androidPersistence.persist({ immediate: true });
  await androidPersistence.saveState({ isPlaying: false });

  assert.equal(localWrites[0].key, "claudio-playback-payload");
  assert.equal(JSON.parse(localWrites[0].value).track.id, "t1");
  assert.equal(localBeacons[0].path, "/api/playback");
  assert.equal(localWrites[1].key, "claudio-playback-state");
  assert.deepEqual(JSON.parse(localWrites[1].value), { isPlaying: false });
  assert.equal(localApiCalls[0].path, "/api/state");
  assert.equal(localApiCalls[0].options.body, JSON.stringify({ isPlaying: false }));
}

console.log("frontend-playback-persistence tests passed");
