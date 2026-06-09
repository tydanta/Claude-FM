import assert from "node:assert/strict";
import { createNeteaseAdapter, normalizeNeteaseAudioLevel } from "../src/server/netease-adapter.js";

const calls = [];
const savedCookies = [];
const adapter = createNeteaseAdapter({
  config: {
    neteaseApiBaseUrl: "https://ncm.example",
    neteaseApiTimeoutMs: 3000,
    neteaseRealIP: "1.2.3.4"
  },
  now: () => 12345,
  getCookie: () => "MUSIC_U=abc",
  setCookie: (cookie) => savedCookies.push(cookie),
  fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "set-cookie": "MUSIC_U=from-header; Path=/" }),
      json: async () => ({ ok: true, cookie: "MUSIC_U=from-body", echo: Object.fromEntries(new URL(String(url)).searchParams) })
    };
  }
});

const getResult = await adapter.request("/login/status", { uid: "42" }, { auth: true });
assert.equal(calls[0].url, "https://ncm.example/login/status?uid=42&timestamp=12345&realIP=1.2.3.4&cookie=MUSIC_U%3Dabc");
assert.equal(calls[0].options.method, "GET");
assert.equal("body" in calls[0].options, false);
assert.equal(getResult.echo.cookie, "MUSIC_U=abc");
assert.equal(getResult.echo.realIP, "1.2.3.4");
assert.deepEqual(savedCookies, ["MUSIC_U=from-header; Path=/", "MUSIC_U=from-body"]);

await adapter.request("/like", { id: "100", like: "true" }, { method: "POST", auth: true });
assert.equal(calls[1].url, "https://ncm.example/like");
assert.equal(calls[1].options.method, "POST");
assert.deepEqual(JSON.parse(calls[1].options.body), {
  id: "100",
  like: "true",
  timestamp: 12345,
  realIP: "1.2.3.4",
  cookie: "MUSIC_U=abc"
});

const rawBodyAdapter = createNeteaseAdapter({
  config: { neteaseApiBaseUrl: "https://ncm.example", neteaseApiTimeoutMs: 3000, neteaseRealIP: "" },
  fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, status: 200, headers: new Headers(), json: async () => ({ ok: true }) };
  }
});
await rawBodyAdapter.request("/raw", {}, { method: "POST", rawBody: "plain=1" });
assert.equal(calls[2].options.body, "plain=1");

const failingAdapter = createNeteaseAdapter({
  config: { neteaseApiBaseUrl: "https://ncm.example", neteaseApiTimeoutMs: 3000, neteaseRealIP: "" },
  fetchImpl: async () => ({
    ok: false,
    status: 500,
    headers: new Headers(),
    json: async () => {
      throw new Error("not json");
    },
    text: async () => "bad gateway"
  })
});
await assert.rejects(
  () => failingAdapter.request("/bad"),
  /Netease \/bad failed: 500 500 bad gateway/
);

assert.equal(normalizeNeteaseAudioLevel("HiRes"), "hires");
assert.equal(normalizeNeteaseAudioLevel("unknown"), "standard");

console.log("netease-adapter tests passed");
