import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Writable } from "node:stream";
import { registerBackgroundRoutes } from "../src/server/routes/background-routes.js";
import { registerVoiceRoutes } from "../src/server/routes/voice-routes.js";
import { createRouter } from "../src/server/router.js";

class FakeResponse extends Writable {
  constructor() {
    super();
    this.headers = {};
    this.status = 0;
    this.body = "";
  }

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
  }

  writeHead(status, headers = {}) {
    this.status = status;
    Object.entries(headers).forEach(([name, value]) => this.setHeader(name, value));
  }

  _write(chunk, encoding, callback) {
    this.body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    callback();
  }
}

function waitForFinish(res) {
  if (res.writableEnded) return Promise.resolve();
  return new Promise((resolve) => res.on("finish", resolve));
}

const root = await mkdtemp(path.join(os.tmpdir(), "claude-fm-file-routes-"));
const backgroundDir = path.join(root, "backgrounds");
const voiceCacheDir = path.join(root, "voice");
await mkdir(backgroundDir, { recursive: true });
await mkdir(voiceCacheDir, { recursive: true });
await writeFile(path.join(backgroundDir, "cover.png"), "png-body", "utf8");
await writeFile(path.join(voiceCacheDir, "sample.mp3"), "mp3-body", "utf8");

const sent = [];
const router = createRouter();
registerBackgroundRoutes(router, {
  backgroundDir,
  getNorthernSettings: () => ({}),
  saveNorthernSettings: (body) => body,
  saveNorthernBackgroundImage: async () => ({}),
  parseBody: async () => ({}),
  sendJson: (res, status, payload) => {
    sent.push({ status, payload });
    res.writeHead?.(status, { "content-type": "application/json; charset=utf-8" });
    res.end?.(JSON.stringify(payload));
  }
});
registerVoiceRoutes(router, {
  voiceCacheDir,
  sendJson: (res, status, payload) => {
    sent.push({ status, payload });
    res.writeHead?.(status, { "content-type": "application/json; charset=utf-8" });
    res.end?.(JSON.stringify(payload));
  }
});

const backgroundRes = new FakeResponse();
assert.equal(await router.handle({
  req: { method: "GET" },
  res: backgroundRes,
  url: new URL("http://localhost/api/background/image/cover.png")
}), true);
await waitForFinish(backgroundRes);
assert.equal(backgroundRes.status, 200);
assert.equal(backgroundRes.headers["content-type"], "image/png");
assert.equal(backgroundRes.body, "png-body");

const voiceRes = new FakeResponse();
assert.equal(await router.handle({
  req: { method: "GET" },
  res: voiceRes,
  url: new URL("http://localhost/api/cache/voice/sample.mp3")
}), true);
await waitForFinish(voiceRes);
assert.equal(voiceRes.status, 200);
assert.equal(voiceRes.headers["content-type"], "audio/mpeg");
assert.equal(voiceRes.body, "mp3-body");

await router.handle({
  req: { method: "GET" },
  res: new FakeResponse(),
  url: new URL("http://localhost/api/background/image/missing.png")
});
await router.handle({
  req: { method: "GET" },
  res: new FakeResponse(),
  url: new URL("http://localhost/api/cache/voice/%2e%2e%2fmissing.mp3")
});

assert.deepEqual(sent, [
  { status: 404, payload: { error: "Background image not found" } },
  { status: 404, payload: { error: "Voice cache item not found" } }
]);

await rm(root, { recursive: true, force: true });

console.log("file-routes tests passed");
