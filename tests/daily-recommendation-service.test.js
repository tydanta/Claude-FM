import assert from "node:assert/strict";
import { createDailyRecommendationService } from "../src/server/daily-recommendation-service.js";

const cleanupCalls = [];
const replaced = [];
const rowsByDate = new Map([
  ["2026-06-05", [
    { id: "netease-track-100", source_id: "100", title: "Today One", cover: "today.jpg" },
    { id: "netease-track-200", source_id: "200", title: "Today Two", cover: "two.jpg" }
  ]],
  ["2026-06-04", [
    { id: "netease-track-090", source_id: "90", title: "Yesterday One", cover: "yesterday.jpg" }
  ]]
]);
const normalizedTracks = [];
const upserted = [];

const service = createDailyRecommendationService({
  dailyRecommendationRepository: {
    cleanup: ({ keepDates }) => {
      cleanupCalls.push(keepDates);
      return 3;
    },
    listByDate: (date) => rowsByDate.get(date) || [],
    replace: (date, tracks, { upsertTrack }) => {
      replaced.push({ date, tracks });
      tracks.forEach(upsertTrack);
    }
  },
  normalizePlaybackTrack: (track, fallback) => {
    normalizedTracks.push({ track, fallback });
    return {
      id: `netease-track-${track.sourceId || track.id}`,
      source: fallback.source,
      sourceId: String(track.sourceId || track.id),
      title: track.title || track.name,
      cover: track.cover || ""
    };
  },
  mapTrackRow: (row) => ({
    id: row.id,
    source: "netease",
    sourceId: row.source_id,
    title: row.title,
    cover: row.cover
  }),
  upsertTrack: (track) => upserted.push(track),
  now: () => Date.UTC(2026, 5, 4, 18, 0, 0)
});

assert.equal(service.getLocalDateKey(0), "2026-06-05");
assert.equal(service.getLocalDateKey(-1), "2026-06-04");
assert.equal(service.normalizeDailyRecommendDate("yesterday"), "2026-06-04");
assert.equal(service.normalizeDailyRecommendDate("history"), "2026-06-04");
assert.equal(service.normalizeDailyRecommendDate("2026-05-30"), "2026-05-30");
assert.equal(service.normalizeDailyRecommendDate(""), "2026-06-05");

assert.equal(service.getDailyRecommendDateFromKey("netease-daily-recommend"), "2026-06-05");
assert.equal(service.getDailyRecommendDateFromKey("netease-daily-recommend-2026-06-04"), "2026-06-04");
assert.equal(service.getDailyRecommendDateFromKey("other"), "");

const todaySongs = service.getLocalDailyRecommendations();
assert.deepEqual(cleanupCalls.at(-1), ["2026-06-05", "2026-06-04"]);
assert.deepEqual(todaySongs.map((track) => track.sourceId), ["100", "200"]);

const todayMeta = service.getDailyRecommendPlaylistMeta("2026-06-05", todaySongs);
assert.deepEqual({
  id: todayMeta.id,
  sourceId: todayMeta.sourceId,
  title: todayMeta.title,
  description: todayMeta.description,
  cover: todayMeta.cover,
  trackCount: todayMeta.trackCount,
  raw: todayMeta.raw
}, {
  id: "netease-daily-recommend-2026-06-05",
  sourceId: "daily-2026-06-05",
  title: "每日推荐",
  description: "网易云今天为你推荐的歌曲。",
  cover: "today.jpg",
  trackCount: 2,
  raw: { kind: "daily-recommendation", date: "2026-06-05" }
});

const yesterdayPlaylist = service.getLocalDailyRecommendationPlaylist("history");
assert.equal(yesterdayPlaylist.title, "历史推荐");
assert.equal(yesterdayPlaylist.tracks[0].sourceId, "90");

rowsByDate.set("2026-05-30", []);
assert.equal(service.getLocalDailyRecommendationPlaylist("2026-05-30"), null);

const stored = service.replaceDailyRecommendations("2026-06-05", [
  { id: "300", name: "Remote One", cover: "remote.jpg" }
]);
assert.deepEqual(normalizedTracks[0].fallback, { source: "netease" });
assert.deepEqual(replaced[0].date, "2026-06-05");
assert.deepEqual(upserted.map((track) => track.sourceId), ["300"]);
assert.deepEqual(stored.map((track) => track.sourceId), ["100", "200"]);

assert.equal(
  service.getPlaybackDailyRecommendationPlaylist({
    playlistSourceId: "daily-2026-06-04"
  }).sourceId,
  "daily-2026-06-04"
);
assert.equal(
  service.getPlaybackDailyRecommendationPlaylist({
    payload: { playlist: { id: "netease-daily-recommend-2026-06-05" } }
  }).sourceId,
  "daily-2026-06-05"
);
assert.equal(service.getPlaybackDailyRecommendationPlaylist({ playlistId: "ordinary" }), null);

console.log("daily-recommendation-service tests passed");
