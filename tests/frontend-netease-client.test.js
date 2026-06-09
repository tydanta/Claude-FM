import assert from "node:assert/strict";
import { createNeteaseClient } from "../public/modules/netease/neteaseClient.js";

const calls = [];
const client = createNeteaseClient(async (url, options = {}) => {
  calls.push({ url, options });
  return { ok: true, url, options };
});

await client.getLoginStatus();
assert.equal(calls.at(-1).url, "/api/netease/login/status");
assert.equal(calls.at(-1).options.weatherLocationQuery, false);

await client.submitPasswordLogin({
  mode: "cellphone",
  phone: "13800000000",
  password: "secret",
  countrycode: "86"
});
assert.equal(calls.at(-1).url, "/api/netease/login/password");
assert.equal(calls.at(-1).options.method, "POST");
assert.deepEqual(calls.at(-1).options.body, {
  mode: "cellphone",
  phone: "13800000000",
  password: "secret",
  countrycode: "86"
});

await client.getPlaylists({ refresh: true });
assert.equal(calls.at(-1).url, "/api/netease/playlists?refresh=1");

await client.getPlaylist({ id: "p1", refresh: false, local: true });
assert.equal(calls.at(-1).url, "/api/netease/playlist?id=p1&local=1");

await client.searchSongs({ keywords: "周杰伦", limit: 12, offset: 24 });
assert.equal(calls.at(-1).url, "/api/netease/search?keywords=%E5%91%A8%E6%9D%B0%E4%BC%A6&limit=12&offset=24");

await client.getArtist({ id: "42", songsPage: 2, albumsPage: 3 });
assert.equal(calls.at(-1).url, "/api/netease/artist?id=42&songsPage=2&albumsPage=3");

await client.getArtist({ name: "Aimer" });
assert.equal(calls.at(-1).url, "/api/netease/artist?name=Aimer&songsPage=1&albumsPage=1");

await client.getAlbum({ id: "album-1" });
assert.equal(calls.at(-1).url, "/api/netease/album?id=album-1");

await client.getRecommendSongs({ date: "yesterday", local: true, limit: 50 });
assert.equal(calls.at(-1).url, "/api/netease/recommend/songs?limit=50&date=yesterday&local=1");

await client.prefetchSongUrls([{ sourceId: "1" }]);
assert.equal(calls.at(-1).url, "/api/netease/song/url/prefetch");
assert.equal(calls.at(-1).options.method, "POST");
assert.deepEqual(calls.at(-1).options.body, { ids: ["1"], limit: 1 });

await client.collectTrack({ playlistId: "p1", track: { sourceId: "s1" } });
assert.equal(calls.at(-1).url, "/api/netease/playlist/tracks");
assert.equal(calls.at(-1).options.method, "POST");
assert.equal(calls.at(-1).options.body.playlistId, "p1");
assert.equal(calls.at(-1).options.body.track.sourceId, "s1");
assert.deepEqual(calls.at(-1).options.body.songIds, ["s1"]);
assert.equal(calls.at(-1).options.body.op, "add");

await client.setLike({ track: { sourceId: "s1" }, liked: true });
assert.equal(calls.at(-1).url, "/api/netease/like");
assert.equal(calls.at(-1).options.body.id, "s1");
assert.equal(calls.at(-1).options.body.like, true);

{
  const storage = new Map();
  const directCalls = [];
  const androidClient = createNeteaseClient(async () => {
    throw new Error("desktop api should not be used in android mode");
  }, {
    isAndroidRuntime: () => true,
    readStorage: (key) => storage.get(key) || "",
    writeStorage: (key, value) => {
      if (value) storage.set(key, String(value));
      else storage.delete(key);
    },
    fetchImpl: async (url, options = {}) => {
      directCalls.push({ url: String(url), options });
      if (String(url).includes("/login/qr/key")) {
        return { ok: true, json: async () => ({ data: { unikey: "qr-key" } }) };
      }
      if (String(url).includes("/login/qr/create")) {
        return { ok: true, json: async () => ({ data: { qrimg: "data:image/png;base64,qr" } }) };
      }
      if (String(url).includes("/login/qr/check")) {
        return { ok: true, json: async () => ({ code: 803, cookie: "MUSIC_U=abc; __csrf=token" }) };
      }
      if (String(url).includes("/login/status")) {
        return {
          ok: true,
          json: async () => ({ data: { profile: { userId: 42, nickname: "Android User" } } })
        };
      }
      return { ok: false, status: 404, json: async () => ({ message: "missing" }) };
    }
  });

  const qr = await androidClient.startQrLogin();
  assert.equal(qr.key, "qr-key");
  assert.equal(qr.qrimg, "data:image/png;base64,qr");
  assert.match(directCalls[0].url, /^http:\/\/127\.0\.0\.1:3010\/login\/qr\/key\?/);
  assert.match(directCalls[1].url, /\/login\/qr\/create\?/);
  assert.match(directCalls[1].url, /key=qr-key/);
  assert.match(directCalls[1].url, /qrimg=true/);

  const checked = await androidClient.checkQrLogin({ key: "qr-key" });
  assert.equal(checked.code, 803);
  assert.equal(checked.loggedIn, true);
  assert.equal(checked.cookieReady, true);
  assert.equal(checked.profile.nickname, "Android User");
  assert.equal(storage.get("netease.cookie"), "MUSIC_U=abc; __csrf=token");
  assert.equal(JSON.parse(storage.get("netease.profile")).userId, 42);
  assert.match(directCalls[2].url, /\/login\/qr\/check\?/);
  assert.match(directCalls[2].url, /noCookie=true/);
  assert.match(directCalls[3].url, /\/login\/status\?/);
  assert.match(directCalls[3].url, /cookie=MUSIC_U%3Dabc%3B\+__csrf%3Dtoken/);
}

{
  const storage = new Map([
    ["netease.cookie", "MUSIC_U=abc"],
    ["netease.profile", JSON.stringify({ userId: 42, nickname: "Android User" })]
  ]);
  const directCalls = [];
  const androidClient = createNeteaseClient(async () => {
    throw new Error("desktop api should not be used in android mode");
  }, {
    isAndroidRuntime: () => true,
    readStorage: (key) => storage.get(key) || "",
    writeStorage: (key, value) => storage.set(key, String(value)),
    fetchImpl: async (url) => {
      directCalls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          playlist: [
            {
              id: 99,
              name: "手机歌单",
              trackCount: 2,
              coverImgUrl: "cover.jpg",
              creator: { nickname: "Android User", userId: 42 }
            }
          ]
        })
      };
    }
  });

  const data = await androidClient.getPlaylists({ refresh: true });
  assert.equal(data.loggedIn, true);
  assert.equal(data.profile.userId, 42);
  assert.equal(data.playlists[0].id, "netease-user-42-playlist-99");
  assert.equal(data.playlists[0].sourceId, "99");
  assert.equal(data.playlists[0].ownerUserId, "42");
  assert.equal(data.playlists[0].title, "手机歌单");
  const playlistCall = directCalls.find((url) => url.includes("/user/playlist"));
  assert.match(playlistCall, /\/user\/playlist\?/);
  assert.match(playlistCall, /uid=42/);
  assert.match(playlistCall, /cookie=MUSIC_U%3Dabc/);
}

{
  let attempts = 0;
  const androidClient = createNeteaseClient(async () => {
    throw new Error("desktop api should not be used in android mode");
  }, {
    isAndroidRuntime: () => true,
    retryDelayMs: 1,
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 3) throw new TypeError("local api is still starting");
      return {
        ok: true,
        json: async () => ({ data: { profile: { userId: 7, nickname: "Ready" } } })
      };
    }
  });

  const status = await androidClient.getLoginStatus();
  assert.equal(attempts, 3);
  assert.equal(status.loggedIn, true);
  assert.equal(status.profile.nickname, "Ready");
}

{
  const directCalls = [];
  const androidClient = createNeteaseClient(async () => {
    throw new Error("desktop api should not be used in android mode");
  }, {
    isAndroidRuntime: () => true,
    readStorage: (key) => key === "netease.cookie" ? "MUSIC_U=abc" : "",
    fetchImpl: async (url) => {
      directCalls.push(String(url));
      if (String(url).includes("/song/url/v1")) {
        return {
          ok: true,
          json: async () => ({ code: 200, data: [{ url: "http://m701.music.126.net/song.mp3", time: 180000 }] })
        };
      }
      if (String(url).includes("/lyric/new")) {
        return {
          ok: true,
          json: async () => ({ code: 200, lrc: { lyric: "[00:01.00]Hi" }, tlyric: { lyric: "[00:01.00]嗨" } })
        };
      }
      return { ok: false, status: 404, json: async () => ({ message: "missing" }) };
    }
  });

  const songUrl = await androidClient.getSongUrl({ songId: "100" });
  assert.equal(
    songUrl.src,
    `http://127.0.0.1:3011/claude/media/audio?url=${encodeURIComponent("https://m701.music.126.net/song.mp3")}&songId=100`
  );

  const lyrics = await androidClient.getLyrics({ songId: "100" });
  assert.equal(lyrics.lyric, "[00:01.00]Hi");
  assert.equal(lyrics.translatedLyric, "[00:01.00]嗨");
  assert.match(directCalls.find((url) => url.includes("/lyric/new")), /id=100/);
}

{
  const directCalls = [];
  const androidClient = createNeteaseClient(() => {
    throw new Error("desktop api should not be called");
  }, {
    isAndroidRuntime: () => true,
    readStorage: (key) => key === "netease.cookie" ? "MUSIC_U=abc" : "",
    fetchImpl: async (url) => {
      directCalls.push(String(url));
      if (String(url).includes("/lyric/new")) {
        return {
          ok: true,
          json: async () => ({
            code: 200,
            lrc: { lyric: "[01:30.00]late only" },
            tlyric: { lyric: "" }
          })
        };
      }
      if (String(url).includes("/lyric")) {
        return {
          ok: true,
          json: async () => ({
            code: 200,
            lrc: { lyric: "[00:03.00]real first\n[01:30.00]late only" },
            tlyric: { lyric: "" }
          })
        };
      }
      return { ok: false, status: 404, json: async () => ({ message: "missing" }) };
    }
  });

  const lyrics = await androidClient.getLyrics({ songId: "late" });

  assert.equal(lyrics.lyric.startsWith("[00:03.00]real first"), true);
  assert.ok(directCalls.some((url) => url.includes("/lyric/new")));
  assert.ok(directCalls.some((url) => url.includes("/lyric?")));
}

{
  const directCalls = [];
  const androidClient = createNeteaseClient(() => {
    throw new Error("desktop api should not be called");
  }, {
    isAndroidRuntime: () => true,
    readStorage: (key) => key === "netease.cookie" ? "MUSIC_U=abc" : "",
    fetchImpl: async (url) => {
      directCalls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          album: { id: 88, name: "Android Album", picUrl: "album.jpg" },
          songs: [{ id: 99, name: "Android Song", al: { id: 88, name: "Android Album", picUrl: "song.jpg" } }]
        })
      };
    }
  });

  const album = await androidClient.getAlbum({ id: "88" });

  assert.equal(album.album.name, "Android Album");
  assert.equal(album.tracks[0].sourceId, "99");
  assert.match(directCalls[0], /\/album\?/);
  assert.match(directCalls[0], /id=88/);
  assert.match(directCalls[0], /cookie=MUSIC_U%3Dabc/);
}

console.log("frontend-netease-client tests passed");
