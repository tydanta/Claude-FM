import assert from "node:assert/strict";
import { createNeteaseAuthService } from "../src/server/netease-auth-service.js";

function createService(overrides = {}) {
  const kv = new Map();
  const writes = [];
  let clearUrlCacheCalls = 0;
  const config = {
    neteaseCookie: "MUSIC_U=env-token; Path=/",
    neteaseApiBaseUrl: "http://127.0.0.1:3010",
    ...overrides.config
  };
  const service = createNeteaseAuthService({
    config,
    getKv: (key, fallback = "") => kv.has(key) ? kv.get(key) : fallback,
    setKv: (key, value) => {
      writes.push([key, value]);
      kv.set(key, value);
    },
    clearNeteaseUrlCache: () => {
      clearUrlCacheCalls += 1;
      return 3;
    },
    ...overrides
  });
  return { service, config, kv, writes, getClearUrlCacheCalls: () => clearUrlCacheCalls };
}

{
  const { service } = createService();
  assert.equal(service.hasNeteaseLoginCookie("foo=1; MUSIC_U=abc"), true);
  assert.equal(service.hasNeteaseLoginCookie("MUSIC_A=abc"), true);
  assert.equal(service.hasNeteaseLoginCookie("MUSIC_X=abc"), false);
}

{
  const { service, config, writes } = createService();
  const merged = service.setNeteaseCookie([
    "MUSIC_U=new-token; Max-Age=1296000; Path=/; HttpOnly",
    "NMTID=nmt; Path=/",
    "MUSIC_U=latest-token; Domain=.music.163.com"
  ]);
  assert.equal(merged, "MUSIC_U=latest-token; NMTID=nmt");
  assert.equal(config.neteaseCookie, "MUSIC_U=latest-token; NMTID=nmt");
  assert.deepEqual(writes, [["netease.cookie", "MUSIC_U=latest-token; NMTID=nmt"]]);
}

{
  const { service, config, writes } = createService({ config: { neteaseCookie: "" } });
  assert.equal(service.setNeteaseCookie(""), "");
  assert.equal(config.neteaseCookie, "");
  assert.deepEqual(writes, []);
}

{
  const { service, kv } = createService({ config: { neteaseCookie: "" } });
  kv.set("netease.cookie", "MUSIC_U=stored");
  assert.equal(service.getNeteaseCookie(), "MUSIC_U=stored");
}

{
  const { service, kv } = createService();
  kv.set("netease.profile", JSON.stringify({ userId: 7, nickname: "Local" }));
  assert.deepEqual(service.getStoredNeteaseProfile(), { userId: 7, nickname: "Local" });
  kv.set("netease.profile", "{bad json");
  assert.equal(service.getStoredNeteaseProfile(), null);
}

{
  const { service, kv, writes, getClearUrlCacheCalls } = createService();
  service.migrateNeteaseApiBaseUrl();
  assert.equal(kv.get("netease.apiBaseUrl"), "http://127.0.0.1:3010");
  assert.deepEqual(writes, [["netease.apiBaseUrl", "http://127.0.0.1:3010"]]);
  assert.equal(getClearUrlCacheCalls(), 0);
}

{
  const { service, kv, writes, getClearUrlCacheCalls } = createService();
  kv.set("netease.cookie", "MUSIC_U=legacy-token");
  kv.set("netease.profile", JSON.stringify({ userId: 9 }));
  service.migrateNeteaseApiBaseUrl();
  assert.equal(kv.get("netease.cookie"), "");
  assert.equal(kv.get("netease.profile"), "null");
  assert.equal(kv.get("netease.apiBaseUrl"), "http://127.0.0.1:3010");
  assert.deepEqual(writes, [
    ["netease.cookie", ""],
    ["netease.profile", "null"],
    ["netease.apiBaseUrl", "http://127.0.0.1:3010"]
  ]);
  assert.equal(getClearUrlCacheCalls(), 1);
}

{
  const { service, kv, writes, getClearUrlCacheCalls } = createService();
  kv.set("netease.apiBaseUrl", "http://127.0.0.1:3010");
  service.migrateNeteaseApiBaseUrl();
  assert.deepEqual(writes, [["netease.apiBaseUrl", "http://127.0.0.1:3010"]]);
  assert.equal(getClearUrlCacheCalls(), 0);
}

{
  const { service, kv, writes, getClearUrlCacheCalls } = createService();
  kv.set("netease.apiBaseUrl", "http://8.152.102.59:3000");
  kv.set("netease.cookie", "MUSIC_U=remote-token");
  kv.set("netease.profile", JSON.stringify({ userId: 8 }));
  service.migrateNeteaseApiBaseUrl();
  assert.equal(kv.get("netease.cookie"), "");
  assert.equal(kv.get("netease.profile"), "null");
  assert.equal(kv.get("netease.apiBaseUrl"), "http://127.0.0.1:3010");
  assert.deepEqual(writes, [
    ["netease.cookie", ""],
    ["netease.profile", "null"],
    ["netease.apiBaseUrl", "http://127.0.0.1:3010"]
  ]);
  assert.equal(getClearUrlCacheCalls(), 1);
}

console.log("netease-auth-service tests passed");
