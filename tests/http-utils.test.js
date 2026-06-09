import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
  applyCorsHeaders,
  getStaticFileTarget,
  parseBody,
  sendJson
} from "../src/server/http-utils.js";

class FakeResponse {
  constructor() {
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

  end(body = "") {
    this.body = String(body);
  }
}

const jsonRes = new FakeResponse();
sendJson(jsonRes, 201, { ok: true });
assert.equal(jsonRes.status, 201);
assert.equal(jsonRes.headers["content-type"], "application/json; charset=utf-8");
assert.equal(jsonRes.headers["cache-control"], "no-store");
assert.deepEqual(JSON.parse(jsonRes.body), { ok: true });

const corsRes = new FakeResponse();
applyCorsHeaders(
  { headers: { origin: "http://localhost:3088" } },
  corsRes,
  ["http://localhost:3088"]
);
assert.equal(corsRes.headers["access-control-allow-origin"], "http://localhost:3088");
assert.equal(corsRes.headers["vary"], "Origin");

const blockedCorsRes = new FakeResponse();
applyCorsHeaders(
  { headers: { origin: "https://example.com" } },
  blockedCorsRes,
  ["http://localhost:3088"]
);
assert.equal(blockedCorsRes.headers["access-control-allow-origin"], undefined);

const parsed = await parseBody(Readable.from([Buffer.from('{"hello":"world"}')]));
assert.deepEqual(parsed, { hello: "world" });

const fallback = await parseBody(Readable.from([Buffer.from("{bad json")]));
assert.deepEqual(fallback, {});

const publicDir = "D:/app/public";
assert.equal(
  getStaticFileTarget(publicDir, "/").filePath.replaceAll("\\", "/"),
  "D:/app/public/index.html"
);
assert.equal(getStaticFileTarget(publicDir, "/../server.js").allowed, false);

console.log("http-utils tests passed");
