import assert from "node:assert/strict";
import { createNeteaseLocalApiService, shouldManageLocalApi } from "../src/server/netease-local-api-service.js";

assert.equal(shouldManageLocalApi("http://127.0.0.1:3010", {}), true);
assert.equal(shouldManageLocalApi("http://localhost:3010", {}), true);
assert.equal(shouldManageLocalApi("http://8.152.102.59:3000", {}), false);
assert.equal(shouldManageLocalApi("http://127.0.0.1:3010", { neteaseLocalApiEnabled: "false" }), false);

{
  const service = createNeteaseLocalApiService({
    config: {
      neteaseApiBaseUrl: "http://remote.example:3000",
      neteaseLocalApiEnabled: "true"
    },
    rootDir: "D:/app",
    fetchImpl: async () => {
      throw new Error("should not fetch remote API during local startup");
    },
    spawnImpl: () => {
      throw new Error("should not spawn for remote API");
    }
  });
  assert.deepEqual(await service.ensureNeteaseLocalApi(), { managed: false, reason: "not-local" });
}

{
  const calls = [];
  const fakeChild = {
    pid: 123,
    unref: () => calls.push(["unref"]),
    kill: () => calls.push(["kill"])
  };
  let attempts = 0;
  const probeUrls = [];
  const service = createNeteaseLocalApiService({
    config: {
      neteaseApiBaseUrl: "http://127.0.0.1:3010",
      neteaseLocalApiEnabled: "true",
      neteaseLocalApiStartupTimeoutMs: 1200
    },
    rootDir: process.cwd(),
    nodePath: "node",
    fetchImpl: async (url) => {
      probeUrls.push(String(url));
      attempts += 1;
      if (attempts < 2) throw new Error("offline");
      return { status: 200 };
    },
    spawnImpl: (command, args, options) => {
      calls.push(["spawn", command, args.at(-1), options.env.HOST, options.env.PORT, options.windowsHide]);
      return fakeChild;
    },
    log: (message) => calls.push(["log", message]),
    warn: (message) => calls.push(["warn", message])
  });
  assert.deepEqual(await service.ensureNeteaseLocalApi(), {
    managed: true,
    started: true,
    baseUrl: "http://127.0.0.1:3010"
  });
  assert.deepEqual(calls[0].slice(0, 2), ["spawn", "node"]);
  assert.equal(calls[0][3], "127.0.0.1");
  assert.equal(calls[0][4], "3010");
  assert.equal(calls[0][5], true);
  assert.deepEqual(calls[1], ["unref"]);
  assert.equal(probeUrls[0], "http://127.0.0.1:3010/");
}

console.log("netease-local-api-service tests passed");
