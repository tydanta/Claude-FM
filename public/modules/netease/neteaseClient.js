import { androidNeteaseBaseUrl, isAndroidRuntime as detectAndroidRuntime } from "../runtime/platform.js";
import { getAndroidMediaProxyUrl, normalizeNeteaseDirectMediaUrl } from "./neteaseMedia.js";

const neteaseOptions = { weatherLocationQuery: false };
const cookieStorageKey = "netease.cookie";
const profileStorageKey = "netease.profile";

function withNeteaseOptions(options = {}) {
  return { ...options, weatherLocationQuery: false };
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false || value === "") return;
    query.set(key, value === true ? "1" : String(value));
  });
  return query.toString();
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseCookiePairs(cookieText = "") {
  const pairs = new Map();
  String(cookieText || "")
    .split(/,(?=\s*[^;,=]+=)|;\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...rest] = part.split("=");
      const name = key?.trim();
      if (!name || /^(Max-Age|Expires|Path|Domain|SameSite|Secure|HttpOnly)$/i.test(name)) return;
      pairs.set(name, `${name}=${rest.join("=").trim()}`);
    });
  return pairs;
}

function mergeCookies(existingCookie = "", incomingCookie = "") {
  const existing = parseCookiePairs(existingCookie);
  const incoming = parseCookiePairs(incomingCookie);
  incoming.forEach((pair, key) => existing.set(key, pair));
  return [...existing.values()].join("; ");
}

function hasLoginCookie(cookie = "") {
  return /(?:^|;\s*)(MUSIC_U|MUSIC_A)=/.test(String(cookie || ""));
}

function defaultIsAndroidRuntime() {
  return detectAndroidRuntime();
}

function normalizeArtist(artist) {
  if (!artist) return { name: "", id: "" };
  if (typeof artist === "string") return { name: artist, id: "" };
  return {
    name: artist.name || "",
    id: artist.id !== undefined ? String(artist.id) : ""
  };
}

function normalizeArtists(value) {
  const artists = Array.isArray(value) ? value : (value ? [value] : []);
  return artists.map(normalizeArtist).filter((artist) => artist.name);
}

function normalizeNeteaseTrack(song = {}) {
  const album = song.al || song.album || {};
  const artists = normalizeArtists(song.ar || song.artists || []);
  const firstArtist = artists[0] || { name: "", id: "" };
  const artistName = artists.map((artist) => artist.name).filter(Boolean).join(" / ");
  const sourceId = String(song.id || song.songId || "");
  return {
    id: `netease-${sourceId}`,
    source: "netease",
    sourceId,
    title: song.name || song.title || "\u672a\u77e5\u6b4c\u66f2",
    artist: artistName || "\u672a\u77e5\u6b4c\u624b",
    artistId: firstArtist.id,
    artists,
    album: album.name || "",
    albumId: album.id !== undefined ? String(album.id) : "",
    cover: album.picUrl || album.pic || song.picUrl || "",
    duration: Math.round(Number(song.dt || song.duration || 0) / 1000),
    src: "",
    mood: "\u7f51\u6613\u4e91",
    reason: "\u6765\u81ea\u7f51\u6613\u4e91\u97f3\u4e50\u3002",
    raw: song
  };
}

function normalizeOwnerPlaylistId(sourceId = "", ownerUserId = "") {
  const owner = String(ownerUserId || "").trim();
  return owner
    ? `netease-user-${owner}-playlist-${sourceId}`
    : `netease-playlist-${sourceId}`;
}

function getPlaylistDescription(playlist = {}, trackCount = 0) {
  const description = String(playlist.description || playlist.copywriter || "").trim();
  if (description) return description;
  const tags = Array.isArray(playlist.tags) ? playlist.tags.filter(Boolean).join(" / ") : "";
  if (tags) return `${tags} / ${trackCount || playlist.trackCount || 0} \u9996\u6b4c`;
  return `${trackCount || playlist.trackCount || 0} \u9996\u6b4c\uff0c\u6765\u81ea\u7f51\u6613\u4e91\u97f3\u4e50\u3002`;
}

function normalizeNeteasePlaylist(playlist = {}, tracks = [], displayOrder = 0, ownerUserId = "") {
  const sourceId = String(playlist.id || "");
  return {
    id: normalizeOwnerPlaylistId(sourceId, ownerUserId),
    source: "netease",
    sourceId,
    ownerUserId: String(ownerUserId || ""),
    title: playlist.name || "\u7f51\u6613\u4e91\u6b4c\u5355",
    subtitle: playlist.creator?.nickname || "\u7f51\u6613\u4e91\u97f3\u4e50",
    description: getPlaylistDescription(playlist, tracks.length),
    cover: playlist.coverImgUrl || playlist.picUrl || "",
    trackCount: Number(playlist.trackCount || tracks.length || 0),
    cachedTrackCount: tracks.length,
    displayOrder,
    tracks,
    raw: playlist
  };
}

function isFreeTrialOnlyAudio(item = {}) {
  const trial = item.freeTrialInfo || item.freeTrialPrivilege;
  const trialEnd = Number(item.freeTrialInfo?.end || 0);
  const durationMs = Number(item.time || 0);
  const fee = Number(item.fee || 0);
  const payed = Number(item.payed || 0);
  return Boolean(
    item.url &&
    trial &&
    fee > 0 &&
    payed <= 0 &&
    (trialEnd > 0 || (durationMs > 0 && durationMs <= 31000))
  );
}

function getLyricStats(text = "") {
  const value = String(text || "");
  const times = [];
  const standardMatches = value.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g);
  for (const match of standardMatches) {
    const fraction = String(match[3] || "").slice(0, 3).padEnd(3, "0");
    times.push(Number(match[1]) * 60 + Number(match[2]) + Number(fraction || 0) / 1000);
  }
  const yrcMatches = value.matchAll(/^\[(-?\d+),\d+\]/gm);
  for (const match of yrcMatches) {
    times.push(Math.max(0, Number(match[1]) / 1000));
  }
  return {
    firstTime: times.length ? Math.min(...times) : Number.POSITIVE_INFINITY,
    lineCount: value.split(/\r?\n/).filter((line) => line.trim()).length
  };
}

function getLyricsResponseStats(data = {}) {
  const text = [
    data?.lrc?.lyric || data?.lyric || "",
    data?.yrc?.lyric || data?.yrcLyric || "",
    data?.tlyric?.lyric || data?.translatedLyric || ""
  ].filter(Boolean).join("\n");
  return getLyricStats(text);
}

function chooseBetterLyricsResponse(primaryData = null, fallbackData = null) {
  if (!primaryData) return fallbackData;
  if (!fallbackData) return primaryData;
  const primary = getLyricsResponseStats(primaryData);
  const fallback = getLyricsResponseStats(fallbackData);
  if (fallback.firstTime + 1 < primary.firstTime) return fallbackData;
  if (fallback.lineCount > primary.lineCount * 1.25 && fallback.firstTime <= primary.firstTime + 1) {
    return fallbackData;
  }
  return primaryData;
}

function createTrialOnlyError(songId, item = {}) {
  const error = new Error(`Netease song ${songId} only returned a free trial audio fragment.`);
  error.code = "NETEASE_FREE_TRIAL_ONLY";
  error.status = 403;
  error.payload = { code: "NETEASE_FREE_TRIAL_ONLY", trial: item.freeTrialInfo || item.freeTrialPrivilege || null };
  return error;
}

export function createNeteaseClient(api, {
  fetchImpl = globalThis.fetch?.bind(globalThis),
  isAndroidRuntime = defaultIsAndroidRuntime,
  readStorage = (key) => globalThis.window?.localStorage?.getItem(key) || "",
  writeStorage = (key, value) => {
    if (value) globalThis.window?.localStorage?.setItem(key, value);
    else globalThis.window?.localStorage?.removeItem(key);
  },
  now = Date.now,
  retryDelayMs = 500,
  maxNetworkAttempts = 31
} = {}) {
  const call = (url, options = {}) => api(url, withNeteaseOptions(options));
  const isAndroid = () => Boolean(isAndroidRuntime?.());

  function getCookie() {
    return String(readStorage(cookieStorageKey) || "");
  }

  function setCookie(cookie = "") {
    const merged = mergeCookies(getCookie(), cookie);
    if (merged) writeStorage(cookieStorageKey, merged);
    return merged;
  }

  function getStoredProfile() {
    return parseJson(readStorage(profileStorageKey), null);
  }

  function setProfile(profile = null) {
    if (profile?.userId) writeStorage(profileStorageKey, JSON.stringify(profile));
    return profile;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function directRequest(pathname, params = {}, { method = "GET", auth = false } = {}) {
    if (!fetchImpl) throw new Error("fetch is not available");
    const url = new URL(pathname, androidNeteaseBaseUrl);
    const payload = {
      ...params,
      timestamp: params.timestamp || now()
    };
    const cookie = getCookie();
    if (auth && cookie && !payload.cookie) payload.cookie = cookie;
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null || payload[key] === "") delete payload[key];
    });
    Object.entries(payload).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    let response;
    let lastError = null;
    for (let attempt = 1; attempt <= maxNetworkAttempts; attempt += 1) {
      try {
        response = await fetchImpl(String(url), { method });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (attempt >= maxNetworkAttempts) break;
        await wait(retryDelayMs);
      }
    }
    if (lastError) throw lastError;
    const body = await response.json().catch(() => ({}));
    if (body.cookie) setCookie(body.cookie);
    if (!response.ok || (body.code && ![200, 800, 801, 802, 803].includes(Number(body.code)))) {
      const error = new Error(body.message || `Netease ${pathname} failed`);
      error.status = response.status;
      error.payload = body;
      throw error;
    }
    return body;
  }

  async function getDirectLoginStatus() {
    const status = await directRequest("/login/status", {}, { auth: true }).catch(() => ({}));
    const profile = setProfile(status?.data?.profile || status?.profile || getStoredProfile());
    const cookieReady = hasLoginCookie(getCookie());
    return {
      ok: true,
      loggedIn: Boolean(profile?.userId || cookieReady),
      offline: false,
      hasLocalData: false,
      profile,
      cookieReady
    };
  }

  async function submitDirectPasswordLogin(payload = {}) {
    const mode = payload.mode === "email" ? "email" : "cellphone";
    const params = mode === "email"
      ? { email: payload.email, password: payload.password, md5_password: payload.md5Password || payload.md5_password }
      : {
          phone: payload.phone,
          password: payload.password,
          md5_password: payload.md5Password || payload.md5_password,
          captcha: payload.captcha,
          countrycode: payload.countrycode || payload.countryCode || "86"
        };
    const endpoint = mode === "email" ? "/login" : "/login/cellphone";
    const data = await directRequest(endpoint, params);
    if (data.cookie) setCookie(data.cookie);
    return getDirectLoginStatus();
  }

  async function startDirectQrLogin() {
    const keyData = await directRequest("/login/qr/key");
    const key = keyData.data?.unikey || keyData.unikey || "";
    const qr = await directRequest("/login/qr/create", { key, qrimg: "true" });
    return {
      ok: true,
      key,
      qrimg: qr.data?.qrimg || qr.qrimg || "",
      qrurl: qr.data?.qrurl || qr.qrurl || ""
    };
  }

  async function checkDirectQrLogin({ key }) {
    const data = await directRequest("/login/qr/check", { key, noCookie: "true" });
    if (Number(data.code) === 803 && data.cookie) setCookie(data.cookie);
    const status = Number(data.code) === 803 ? await getDirectLoginStatus() : { cookieReady: hasLoginCookie(getCookie()), profile: getStoredProfile() };
    return {
      ok: true,
      code: data.code,
      message: data.message || "",
      cookieReady: Boolean(status.cookieReady),
      loggedIn: Boolean(status.loggedIn || status.profile?.userId || status.cookieReady),
      profile: status.profile || null
    };
  }

  async function getDirectPlaylists() {
    const status = await getDirectLoginStatus();
    const profile = status.profile || getStoredProfile();
    const uid = String(profile?.userId || profile?.user?.userId || "");
    if (!uid) {
      return { ok: true, loggedIn: false, cookieReady: status.cookieReady, profile, playlists: [], source: "android-local-api" };
    }
    const data = await directRequest("/user/playlist", { uid, limit: 1000 }, { auth: true });
    const playlists = (data.playlist || []).map((playlist, index) =>
      normalizeNeteasePlaylist(playlist, [], playlist.specialType === 5 ? -1 : index + 1, uid)
    );
    return {
      ok: true,
      loggedIn: true,
      cookieReady: status.cookieReady,
      profile,
      playlists,
      source: "android-local-api"
    };
  }

  async function getDirectPlaylist({ id }) {
    const status = await getDirectLoginStatus();
    const ownerUserId = String(status.profile?.userId || status.profile?.user?.userId || "");
    const [detail, allTracks] = await Promise.all([
      directRequest("/playlist/detail", { id }, { auth: true }).catch(() => ({})),
      directRequest("/playlist/track/all", { id, limit: 1000 }, { auth: true }).catch(() => ({}))
    ]);
    const rawPlaylist = detail.playlist || { id };
    const tracks = (allTracks.songs || rawPlaylist.tracks || []).map(normalizeNeteaseTrack).filter((track) => track.sourceId);
    return {
      ok: true,
      playlist: normalizeNeteasePlaylist(rawPlaylist, tracks, rawPlaylist.specialType === 5 ? -1 : 0, ownerUserId),
      source: "android-local-api"
    };
  }

  async function getDirectRecommendSongs({ limit = 50 } = {}) {
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const data = await directRequest("/recommend/songs", { limit: safeLimit }, { auth: true });
    const songs = (data.data?.dailySongs || data.recommend || []).map(normalizeNeteaseTrack).slice(0, safeLimit);
    return {
      ok: true,
      source: "android-local-api",
      songs,
      playlist: {
        id: "netease-daily-recommend",
        title: "\u7f51\u6613\u4e91 \u6bcf\u65e5\u63a8\u8350",
        tracks: songs
      }
    };
  }

  async function getDirectArtist({ id, name }) {
    let artistId = id;
    let searchedArtist = null;
    if (!artistId && name) {
      const search = await directRequest("/search", { keywords: name, type: 100, limit: 1 }, { auth: true }).catch(() => ({}));
      searchedArtist = search.result?.artists?.[0] || null;
      artistId = searchedArtist?.id;
    }
    if (!artistId) {
      return { ok: true, offline: true, source: "android-local-api", artistId: "", artist: { id: "", name: name || "\u6b4c\u624b" }, songs: [], albums: [] };
    }
    const [detail, songs, albums] = await Promise.all([
      directRequest("/artist/detail", { id: artistId }, { auth: true }).catch(() => ({})),
      directRequest("/artist/songs", { id: artistId, limit: 50 }, { auth: true }).catch(() => ({})),
      directRequest("/artist/album", { id: artistId, limit: 20 }, { auth: true }).catch(() => ({}))
    ]);
    return {
      ok: true,
      source: "android-local-api",
      artistId: String(artistId),
      artist: detail.data?.artist || songs.artist || albums.artist || searchedArtist || { id: artistId, name: name || "\u6b4c\u624b" },
      songs: (songs.songs || []).map(normalizeNeteaseTrack),
      albums: albums.hotAlbums || []
    };
  }

  async function getDirectAlbum({ id }) {
    const albumId = String(id || "").trim();
    if (!albumId) return { ok: true, source: "android-local-api", album: {}, tracks: [] };
    const data = await directRequest("/album", { id: albumId }, { auth: true });
    const tracks = (data.songs || data.album?.songs || []).map(normalizeNeteaseTrack).filter((track) => track.sourceId);
    return {
      ok: true,
      source: "android-local-api",
      album: data.album || { id: albumId },
      tracks
    };
  }

  async function searchDirectSongs({ keywords, limit = 12, offset = 0 }) {
    if (!String(keywords || "").trim()) return { ok: true, songs: [], playlists: [], artists: [] };
    const data = await directRequest("/search", { keywords, type: 1, limit, offset }, { auth: true });
    const result = data.result || {};
    return {
      ok: true,
      source: "android-local-api",
      songs: (result.songs || []).map(normalizeNeteaseTrack),
      hasMore: Boolean(result.hasMore),
      playlists: result.playlists || [],
      artists: result.artists || []
    };
  }

  async function getDirectSongUrl({ songId, refresh = false }) {
    const data = await directRequest("/song/url/v1", { id: songId, level: "standard", refresh }, { auth: true });
    const item = data.data?.[0] || {};
    if (isFreeTrialOnlyAudio(item)) throw createTrialOnlyError(songId, item);
    const normalizedUrl = normalizeNeteaseDirectMediaUrl(item.url || "");
    return {
      ok: true,
      id: String(songId || ""),
      src: normalizedUrl ? getAndroidMediaProxyUrl(normalizedUrl, { type: "audio", songId }) : "",
      directSrc: normalizedUrl,
      cached: false,
      stale: false,
      expiresAt: Number(now()) + 20 * 60 * 1000
    };
  }

  async function getDirectLyrics({ songId }) {
    const [newData, legacyData] = await Promise.all([
      directRequest("/lyric/new", { id: songId }, { auth: true }).catch(() => null),
      directRequest("/lyric", { id: songId }, { auth: true }).catch(() => null)
    ]);
    const data = chooseBetterLyricsResponse(newData, legacyData) || {};
    return {
      ok: true,
      source: "android-local-api",
      lyric: data.lrc?.lyric || data.lyric || "",
      yrcLyric: data.yrc?.lyric || data.yrcLyric || "",
      translatedLyric: data.tlyric?.lyric || data.translatedLyric || "",
      raw: data
    };
  }

  async function getDirectHeartbeat({ songId, playlistId, limit = 20 }) {
    const params = {
      id: songId,
      songId,
      startMusicId: songId,
      limit: Math.max(1, Math.min(100, Number(limit) || 20))
    };
    if (playlistId) {
      params.pid = playlistId;
      params.playlistId = playlistId;
    }
    const data = await directRequest("/playmode/intelligence/list", params, { auth: true });
    const songs = (data.data || data.songs || data.recommend || [])
      .map((item) => item.songInfo || item.song || item)
      .map(normalizeNeteaseTrack)
      .filter((track) => track.sourceId);
    return { ok: true, songs };
  }

  return {
    getLoginStatus() {
      return isAndroid() ? getDirectLoginStatus() : call("/api/netease/login/status");
    },
    submitPasswordLogin(payload = {}) {
      return isAndroid() ? submitDirectPasswordLogin(payload) : call("/api/netease/login/password", {
        method: "POST",
        body: payload
      });
    },
    startQrLogin() {
      return isAndroid() ? startDirectQrLogin() : call("/api/netease/login/qr/start", { method: "POST" });
    },
    checkQrLogin({ key }) {
      return isAndroid() ? checkDirectQrLogin({ key }) : call("/api/netease/login/qr/check", {
        method: "POST",
        body: { key }
      });
    },
    getPlaylists({ refresh = false } = {}) {
      return isAndroid() ? getDirectPlaylists({ refresh }) : call(`/api/netease/playlists${refresh ? "?refresh=1" : ""}`);
    },
    getPlaylist({ id, refresh = false, local = false }) {
      if (isAndroid()) return getDirectPlaylist({ id, refresh, local });
      const query = buildQuery({ id, refresh, local });
      return call(`/api/netease/playlist?${query}`);
    },
    getRecommendSongs({ date = "", local = false, limit = 50 } = {}) {
      if (isAndroid()) return getDirectRecommendSongs({ date, local, limit });
      const query = buildQuery({ limit, date, local });
      return call(`/api/netease/recommend/songs?${query}`);
    },
    addPlaylistTrack({ playlistId, track }) {
      if (isAndroid()) {
        return directRequest("/playlist/tracks", {
          op: "add",
          pid: playlistId,
          tracks: track?.sourceId || ""
        }, { auth: true }).then((result) => ({ ok: true, localChanged: 0, result }));
      }
      return call("/api/netease/playlist/tracks", {
        method: "POST",
        body: {
          op: "add",
          placement: "prepend",
          playlistId,
          songIds: track?.sourceId ? [track.sourceId] : [],
          track
        }
      });
    },
    collectTrack({ playlistId, track }) {
      return this.addPlaylistTrack({ playlistId, track });
    },
    removePlaylistTrack({ playlistId, trackId, sourceId }) {
      if (isAndroid()) {
        return directRequest("/playlist/tracks", {
          op: "del",
          pid: playlistId,
          tracks: sourceId || trackId || ""
        }, { auth: true }).then((result) => ({ ok: true, localChanged: 0, result }));
      }
      return call("/api/netease/playlist/tracks", {
        method: "POST",
        body: {
          op: "del",
          playlistId,
          songIds: [sourceId || trackId].filter(Boolean)
        }
      });
    },
    setLike({ track, liked }) {
      if (isAndroid()) {
        return directRequest("/like", {
          id: track?.sourceId || "",
          like: Boolean(liked)
        }, { auth: true }).then((result) => ({ ok: true, liked: Boolean(liked), result }));
      }
      return call("/api/netease/like", {
        method: "POST",
        body: {
          id: track?.sourceId || "",
          like: Boolean(liked),
          track
        }
      });
    },
    getArtist({ id, name, songsPage = 1, albumsPage = 1 }) {
      if (isAndroid()) return getDirectArtist({ id, name, songsPage, albumsPage });
      const query = buildQuery({ id, name, songsPage, albumsPage });
      return call(`/api/netease/artist?${query}`);
    },
    getAlbum({ id }) {
      if (isAndroid()) return getDirectAlbum({ id });
      const query = buildQuery({ id });
      return call(`/api/netease/album?${query}`);
    },
    searchSongs({ keywords, limit = 12, offset = 0 }) {
      if (isAndroid()) return searchDirectSongs({ keywords, limit, offset });
      const query = buildQuery({ keywords, limit, offset });
      return call(`/api/netease/search?${query}`);
    },
    prefetchSongUrls(tracks = []) {
      if (isAndroid()) return Promise.resolve({ ok: true, count: tracks.length });
      const ids = tracks.map((track) => track?.sourceId).filter(Boolean);
      return call("/api/netease/song/url/prefetch", {
        method: "POST",
        body: { ids, limit: ids.length }
      });
    },
    getSongUrl({ songId, refresh = false }) {
      return isAndroid() ? getDirectSongUrl({ songId, refresh }) : call(`/api/netease/song/url?${buildQuery({ id: songId, refresh })}`);
    },
    getLyrics({ songId, refresh = false }) {
      if (isAndroid()) return getDirectLyrics({ songId, refresh });
      return call(`/api/lyrics?${buildQuery({ source: "netease", id: songId, refresh })}`);
    },
    getHeartbeat({ songId, playlistId, limit = 20 }) {
      if (isAndroid()) return getDirectHeartbeat({ songId, playlistId, limit });
      const query = buildQuery({ songId, playlistId, limit });
      return call(`/api/netease/heartbeat?${query}`);
    }
  };
}

export { neteaseOptions };
