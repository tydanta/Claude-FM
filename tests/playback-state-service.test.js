import assert from "node:assert/strict";
import { createPlaybackStateService } from "../src/server/playback-state-service.js";

const calls = [];
let queueRows = [];
let stateRow = null;

const service = createPlaybackStateService({
  playbackRepository: {
    replaceQueueItems: (queue, options) => calls.push(["replaceQueue", queue, options]),
    readQueueItems: () => queueRows,
    saveState: (record) => {
      calls.push(["saveState", record]);
      stateRow = {
        source: record.source,
        trackId: record.trackId,
        sourceTrackId: record.sourceTrackId,
        playlistId: record.playlistId,
        playlistSourceId: record.playlistSourceId,
        position: record.position,
        duration: record.duration,
        isPlaying: Boolean(record.isPlaying),
        payloadJson: record.payloadJson,
        updatedAt: "2026-06-05 10:00:00"
      };
    },
    readState: () => stateRow
  },
  upsertTrack: (track) => calls.push(["upsertTrack", track]),
  upsertPlaylist: (playlist) => calls.push(["upsertPlaylist", playlist]),
  appendPlaylistTracks: (playlistId, tracks) => calls.push(["appendPlaylistTracks", playlistId, tracks]),
  mapTrackRow: (row) => row?.id ? ({
    id: row.id,
    source: row.source,
    sourceId: row.source_id,
    title: row.title,
    artist: row.artist,
    cover: row.cover,
    duration: row.duration,
    src: row.src
  }) : null,
  isLocalTrackLiked: (id, sourceId) => id === "netease-track-100" && sourceId === "100"
});

assert.deepEqual(service.normalizePlaybackTrack({
  source_id: "100",
  name: "Song",
  artist: "Artist",
  artist_id: "artist-1",
  album_id: "album-1",
  picUrl: "cover.jpg",
  duration: 180
}), {
  id: "netease-track-100",
  source: "netease",
  sourceId: "100",
  title: "Song",
  artist: "Artist",
  artistId: "artist-1",
  artists: [],
  album: "",
  albumId: "album-1",
  cover: "cover.jpg",
  duration: 180,
  src: "",
  raw: {
    source_id: "100",
    name: "Song",
    artist: "Artist",
    artist_id: "artist-1",
    album_id: "album-1",
    picUrl: "cover.jpg",
    duration: 180
  }
});

assert.equal(service.normalizePlaybackTrack({}, {}), null);

const normalizedPlaylist = service.normalizePlaybackPlaylist({ source_id: "pl1", name: "List", coverImgUrl: "pl.jpg" }, [
  { id: "t1", cover: "track.jpg" }
]);
assert.equal(normalizedPlaylist.id, "netease-playlist-pl1");
assert.equal(normalizedPlaylist.title, "List");
assert.equal(normalizedPlaylist.trackCount, 1);
assert.equal(normalizedPlaylist.cover, "pl.jpg");
assert.equal(service.normalizePlaybackPlaylist({}, []), null);
assert.equal(service.isRealNeteasePlaylist({ source: "netease", sourceId: "pl1" }), true);
assert.equal(service.isRealNeteasePlaylist({ source: "local", sourceId: "pl1" }), false);

service.savePlaybackState({
  track: { sourceId: "100", title: "Song", duration: 180 },
  playlist: { id: "local-playlist", source: "local", title: "Local List" },
  queue: [
    { sourceId: "100", title: "Song", duration: 180 },
    { id: "local-track", source: "local", title: "Local Track", duration: 90 }
  ],
  position: -4,
  duration: 0,
  isPlaying: true
});

assert.equal(calls[0][0], "upsertTrack");
assert.equal(calls[0][1].id, "netease-track-100");
assert.equal(calls.find((call) => call[0] === "upsertPlaylist")[1].id, "local-playlist");
assert.equal(calls.find((call) => call[0] === "appendPlaylistTracks")[1], "local-playlist");
assert.equal(calls.find((call) => call[0] === "replaceQueue")[1].length, 2);
const savedRecord = calls.find((call) => call[0] === "saveState")[1];
assert.equal(savedRecord.source, "netease");
assert.equal(savedRecord.trackId, "netease-track-100");
assert.equal(savedRecord.sourceTrackId, "100");
assert.equal(savedRecord.playlistId, "local-playlist");
assert.equal(savedRecord.position, 0);
assert.equal(savedRecord.duration, 180);
assert.equal(savedRecord.isPlaying, 1);
assert.equal(JSON.parse(savedRecord.payloadJson).queue.length, 2);

assert.deepEqual(service.readPlaybackState(), {
  source: "netease",
  trackId: "netease-track-100",
  sourceTrackId: "100",
  playlistId: "local-playlist",
  playlistSourceId: "",
  position: 0,
  duration: 180,
  isPlaying: true,
  payload: JSON.parse(savedRecord.payloadJson),
  updatedAt: "2026-06-05 10:00:00"
});

queueRows = [
  {
    id: "netease-track-100",
    source: "netease",
    source_id: "100",
    title: "Cached Row",
    artist: "Row Artist",
    cover: "row.jpg",
    duration: 181,
    src: "row.mp3",
    payloadJson: JSON.stringify({ id: "netease-track-100", source: "netease", sourceId: "100", title: "Payload", duration: 180 })
  },
  {
    id: "local-track",
    source: "local",
    source_id: "",
    title: "Local Row",
    artist: "",
    cover: "",
    duration: 90,
    src: "local.mp3",
    payloadJson: ""
  }
];
assert.deepEqual(service.readPlaybackQueueItems().map((track) => ({
  id: track.id,
  title: track.title,
  src: track.src,
  cover: track.cover,
  duration: track.duration,
  liked: track.liked
})), [
  { id: "netease-track-100", title: "Payload", src: "row.mp3", cover: "row.jpg", duration: 180, liked: true },
  { id: "local-track", title: "Local Row", src: "local.mp3", cover: "", duration: 90, liked: false }
]);

stateRow = null;
assert.equal(service.readPlaybackState(), null);

console.log("playback-state-service tests passed");
