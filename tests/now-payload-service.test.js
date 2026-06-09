import assert from "node:assert/strict";
import { createNowPayloadService } from "../src/server/now-payload-service.js";

const tracks = [
  { id: "mock-1", title: "Morning Desk Light", source: "mock", duration: 171 },
  { id: "mock-2", title: "Soft Focus Loop", source: "mock", duration: 145 }
];

function createService(overrides = {}) {
  const calls = [];
  const state = {
    currentIndex: 0,
    isPlaying: true,
    volume: 0.6,
    preferences: { focus: "steady" }
  };
  const deps = {
    state,
    tracks,
    getWeather: async (location) => {
      calls.push(["weather", location]);
      return { summary: "晴", tempC: 28 };
    },
    getSchedule: async () => {
      calls.push(["schedule"]);
      return [{ title: "focus" }];
    },
    readPlaybackState: () => null,
    readPlaybackQueueItems: () => [],
    savePlaybackState: (payload) => calls.push(["savePlayback", payload]),
    getPlaybackDailyRecommendationPlaylist: () => null,
    getLocalNeteasePlaylistDetail: () => null,
    findLocalNeteasePlaylistForTrack: () => null,
    getLocalTrackById: () => null,
    getLocalTrackBySourceId: () => null,
    readNeteaseUrlCache: () => null,
    isLocalTrackLiked: () => false,
    getTimeBlock: () => "morning",
    askClaudeForDjLine: async (context) => {
      calls.push(["dj", context.track.id, context.weather.tempC, context.timeBlock]);
      return "desk line";
    },
    getIntegrations: () => ({ netease: true }),
    getInsightForTrack: async (track, weather, schedule, timeBlock) => {
      calls.push(["insight", track.id, weather.tempC, schedule.length, timeBlock]);
      return { insight: { text: "listen closely" }, insightError: "" };
    },
    ...overrides
  };
  return { service: createNowPayloadService(deps), calls, state };
}

{
  const { service, calls, state } = createService({
    readPlaybackState: () => ({ trackId: "mock-2", position: 42, duration: 145, updatedAt: "now" })
  });
  const payload = await service.buildNowPayload({ location: { city: "Shanghai" } });
  assert.equal(state.currentIndex, 1);
  assert.equal(payload.track.id, "mock-2");
  assert.deepEqual(payload.queue.map((track) => track.id), ["mock-1", "mock-2"]);
  assert.equal(payload.state.position, 42);
  assert.equal(payload.state.isPlaying, false);
  assert.equal(payload.djLine, "desk line");
  assert.deepEqual(payload.insight, { text: "listen closely" });
  assert.equal(payload.insightPending, false);
  assert.deepEqual(calls.filter((call) => call[0] === "insight"), [["insight", "mock-2", 28, 1, "morning"]]);
}

{
  const neteaseTrack = { id: "local-100", source: "netease", sourceId: "100", title: "Remote Song", duration: 210 };
  const playlist = {
    id: "playlist-local",
    source: "netease",
    sourceId: "pl-1",
    title: "Remote Playlist",
    subtitle: "cloud",
    description: "from netease",
    cover: "/cover.jpg",
    trackCount: 1,
    tracks: [neteaseTrack]
  };
  const { service, calls } = createService({
    readPlaybackState: () => ({
      source: "netease",
      trackId: "local-100",
      sourceTrackId: "100",
      position: 12,
      duration: 0,
      playlistSourceId: "pl-1",
      payload: {}
    }),
    getLocalNeteasePlaylistDetail: (id) => id === "pl-1" ? playlist : null,
    getLocalTrackById: () => neteaseTrack,
    readNeteaseUrlCache: (id) => id === "100" ? { url: "https://audio.example/100.mp3" } : null,
    isLocalTrackLiked: (id, sourceId) => id === "local-100" && sourceId === "100"
  });
  const payload = await service.buildNowPayload({ includeInsight: false });
  assert.equal(payload.track.src, "https://audio.example/100.mp3");
  assert.equal(payload.track.liked, true);
  assert.equal(payload.queue[0].liked, true);
  assert.equal(payload.state.playback.playlistSourceId, "pl-1");
  assert.equal(payload.state.playback.playlist.title, "Remote Playlist");
  assert.equal(payload.insightPending, true);
  assert.equal(calls.some((call) => call[0] === "insight"), false);
}

{
  const neteaseTrack = { id: "local-200", source: "netease", sourceId: "200", title: "Daily Song", duration: 180 };
  const dailyPlaylist = {
    id: "daily-recommendation",
    source: "netease",
    sourceId: "daily-recommendation",
    title: "每日推荐",
    tracks: [neteaseTrack],
    trackCount: 1
  };
  const { service, calls } = createService({
    readPlaybackState: () => ({
      source: "netease",
      trackId: "local-200",
      sourceTrackId: "200",
      position: 8,
      duration: 0,
      payload: {}
    }),
    getPlaybackDailyRecommendationPlaylist: () => dailyPlaylist,
    getLocalTrackBySourceId: () => neteaseTrack
  });
  const payload = await service.buildBasePayload();
  assert.equal(payload.track.id, "local-200");
  assert.equal(payload.state.playback.playlistId, "daily-recommendation");
  assert.deepEqual(calls.find((call) => call[0] === "savePlayback")?.[1].playlist, {
    id: "daily-recommendation",
    source: "netease",
    sourceId: "daily-recommendation",
    title: "每日推荐",
    subtitle: undefined,
    description: undefined,
    cover: undefined,
    trackCount: 1
  });
}

console.log("now-payload-service tests passed");
