import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const listeners = {};
const cacheCalls = [];
const fetchCalls = [];

const context = {
  URL,
  Promise,
  caches: {
    open: async (name) => ({
      addAll: async (assets) => cacheCalls.push(["addAll", name, assets])
    }),
    keys: async () => ["old-cache"],
    delete: async (key) => {
      cacheCalls.push(["delete", key]);
      return true;
    },
    match: async (request) => {
      cacheCalls.push(["match", request.url]);
      return { fromCache: true };
    }
  },
  fetch: async (request, options) => {
    fetchCalls.push([request.url, options]);
    return { ok: true };
  },
  self: {
    clients: {
      claim: async () => cacheCalls.push(["claim"])
    },
    skipWaiting: () => cacheCalls.push(["skipWaiting"]),
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  }
};

vm.createContext(context);
vm.runInContext(await readFile("public/sw.js", "utf8"), context, { filename: "public/sw.js" });

function createFetchEvent(url) {
  const event = {
    request: { url },
    respondWith(responsePromise) {
      event.responded = true;
      event.responsePromise = responsePromise;
    }
  };
  return event;
}

for (const path of ["/api/now?insight=0", "/api/netease/song/url?id=100"]) {
  const event = createFetchEvent(`http://localhost:3088${path}`);
  listeners.fetch(event);
  assert.equal(event.responded, undefined);
}
assert.deepEqual(fetchCalls, []);

const androidApiEvent = createFetchEvent("http://127.0.0.1:3010/login/status");
listeners.fetch(androidApiEvent);
assert.equal(androidApiEvent.responded, undefined);
assert.deepEqual(fetchCalls, []);

const androidMediaEvent = createFetchEvent("http://127.0.0.1:3011/claude/media/audio?url=x");
listeners.fetch(androidMediaEvent);
assert.equal(androidMediaEvent.responded, undefined);
assert.deepEqual(fetchCalls, []);

const staticEvent = createFetchEvent("http://localhost:3088/icons/icon.svg");
listeners.fetch(staticEvent);
assert.equal(staticEvent.responded, true);
await staticEvent.responsePromise;
assert.equal(fetchCalls.length, 1);
assert.equal(fetchCalls[0][0], "http://localhost:3088/icons/icon.svg");
assert.equal(fetchCalls[0][1].cache, "no-store");

console.log("service-worker-cache tests passed");
