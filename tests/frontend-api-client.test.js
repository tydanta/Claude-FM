import assert from "node:assert/strict";
import {
  createApiClient,
  createRemoteCapabilityBaseUrl
} from "../public/modules/apiClient.js";

{
  const writes = [];
  assert.equal(
    createRemoteCapabilityBaseUrl("?api=http://remote.example/", (key, value) => writes.push([key, value])),
    "http://remote.example"
  );
  assert.deepEqual(writes, [["claudio-remote-api", "http://remote.example"]]);
}

{
  const writes = [];
  assert.equal(
    createRemoteCapabilityBaseUrl("", (key, value) => writes.push([key, value]), () => "http://stored.example/"),
    "http://stored.example"
  );
  assert.deepEqual(writes, []);
}

{
  const calls = [];
  const client = createApiClient({
    remoteCapabilityBaseUrl: "",
    appendWeatherLocationQuery: (path) => `${path}${path.includes("?") ? "&" : "?"}lat=1&lon=2`,
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { ok: true, json: async () => ({ url }) };
    }
  });
  assert.deepEqual(await client.api("/api/now"), { url: "/api/now?lat=1&lon=2" });
  await client.api("/api/settings", { weatherLocationQuery: false, method: "POST", body: "{}" });
  assert.equal(calls[1][0], "/api/settings");
  assert.equal(calls[1][1].method, "POST");
}

{
  const calls = [];
  const client = createApiClient({
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { ok: true, json: async () => ({ ok: true }) };
    }
  });
  await client.api("/api/netease/login/qr/check", {
    method: "POST",
    body: { key: "qr-key" },
    weatherLocationQuery: false
  });
  assert.equal(calls[0][0], "/api/netease/login/qr/check");
  assert.equal(calls[0][1].body, JSON.stringify({ key: "qr-key" }));
}

{
  const client = createApiClient({
    remoteCapabilityBaseUrl: "http://remote.example",
    appendWeatherLocationQuery: (path) => path
  });
  assert.equal(
    client.getApiUrl("/api/chat?x=1"),
    "/api/remote?baseUrl=http%3A%2F%2Fremote.example&path=%2Fapi%2Fchat%3Fx%3D1"
  );
  assert.equal(client.getApiUrl("/api/netease/search"), "/api/netease/search");
  assert.equal(
    client.resolveApiAssetUrl("/api/cache/voice/a.wav"),
    "/api/remote?baseUrl=http%3A%2F%2Fremote.example&path=%2Fapi%2Fcache%2Fvoice%2Fa.wav"
  );
  assert.equal(client.resolveApiAssetUrl("https://cdn.example/a.wav"), "https://cdn.example/a.wav");
}

{
  const client = createApiClient({
    localCapabilityBaseUrl: "http://127.0.0.1:3012",
    appendWeatherLocationQuery: (path) => path
  });
  assert.equal(client.getApiUrl("/api/chat?x=1"), "http://127.0.0.1:3012/api/chat?x=1");
  assert.equal(client.getApiUrl("/api/weather?lat=1"), "http://127.0.0.1:3012/api/weather?lat=1");
  assert.equal(client.getApiUrl("/api/netease/search"), "/api/netease/search");
}

{
  const client = createApiClient({
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) })
  });
  await assert.rejects(() => client.api("/api/bad"), /\/api\/bad 503/);
}

{
  const client = createApiClient({
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({
        code: "NETEASE_FREE_TRIAL_ONLY",
        error: "这首歌网易云只返回 30 秒试听，暂时无法播放完整版。"
      })
    })
  });
  await assert.rejects(
    () => client.api("/api/netease/song/url?id=1"),
    (error) => {
      assert.equal(error.status, 403);
      assert.equal(error.code, "NETEASE_FREE_TRIAL_ONLY");
      assert.equal(error.message, "这首歌网易云只返回 30 秒试听，暂时无法播放完整版。");
      return true;
    }
  );
}

{
  const calls = [];
  const client = createApiClient({
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { ok: true, json: async () => ({}) };
    },
    setTimeoutFn: (fn, ms) => {
      calls.push(["timeout", ms]);
      return 1;
    },
    clearTimeoutFn: (id) => calls.push(["clear", id])
  });
  await client.api("/api/slow", { timeoutMs: 25 });
  assert.equal(calls[0][0], "timeout");
  assert.equal(Boolean(calls[1][1].signal), true);
  assert.deepEqual(calls.at(-1), ["clear", 1]);
}

{
  const calls = [];
  const client = createApiClient({
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return { ok: true };
    },
    setTimeoutFn: () => 7,
    clearTimeoutFn: (id) => calls.push(["clear", id])
  });
  await client.fetchWithTimeout("/asset", { headers: { accept: "text/plain" } }, 50);
  assert.equal(calls[0][0], "/asset");
  assert.equal(Boolean(calls[0][1].signal), true);
  assert.deepEqual(calls[1], ["clear", 7]);
}

console.log("frontend-api-client tests passed");
