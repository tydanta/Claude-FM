import assert from "node:assert/strict";
import { readStorage, writeStorage } from "../public/modules/storage.js";

function createStorage({ throwOnGet = false, throwOnSet = false, throwOnRemove = false } = {}) {
  const data = new Map();
  return {
    data,
    getItem(key) {
      if (throwOnGet) throw new Error("get failed");
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnSet) throw new Error("set failed");
      data.set(key, String(value));
    },
    removeItem(key) {
      if (throwOnRemove) throw new Error("remove failed");
      data.delete(key);
    }
  };
}

const storage = createStorage();
globalThis.window = { localStorage: storage };

assert.equal(readStorage("missing"), "");
writeStorage("mode", "dark");
assert.equal(readStorage("mode"), "dark");
writeStorage("mode", "");
assert.equal(readStorage("mode"), "");

globalThis.window = { localStorage: createStorage({ throwOnGet: true }) };
assert.equal(readStorage("mode"), "");

globalThis.window = { localStorage: createStorage({ throwOnSet: true }) };
assert.doesNotThrow(() => writeStorage("mode", "dark"));

globalThis.window = { localStorage: createStorage({ throwOnRemove: true }) };
assert.doesNotThrow(() => writeStorage("mode", ""));

delete globalThis.window;

console.log("frontend-storage tests passed");
