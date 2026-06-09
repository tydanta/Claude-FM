import assert from "node:assert/strict";
import { createRemoteCapabilityService } from "../src/server/remote-capability-service.js";

function createResponse() {
  return {
    status: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    }
  };
}

function createService(overrides = {}) {
  const sent = [];
  const parsed = [];
  const fetchCalls = [];
  const service = createRemoteCapabilityService({
    config: { remoteCapabilityBaseUrl: "https://remote.example/base/" },
    parseBody: async (req) => {
      parsed.push(req.body);
      return req.body;
    },
    sendJson: (res, status, payload) => sent.push({ status, payload }),
    fetchImpl: async (target, options) => {
      fetchCalls.push([String(target), options]);
      if (overrides.fetchError) throw overrides.fetchError;
      return overrides.response || {
        status: 201,
        headers: {
          get: (name) => ({ "content-type": "application/json", "cache-control": "max-age=10" })[name] || ""
        },
        arrayBuffer: async () => Buffer.from("remote-body")
      };
    },
    setTimeoutFn: (fn, ms) => {
      fetchCalls.push(["timeout", ms]);
      return 7;
    },
    clearTimeoutFn: (id) => fetchCalls.push(["clear", id]),
    ...overrides.service
  });
  return { service, sent, parsed, fetchCalls };
}

{
  const { service, sent } = createService({ service: { config: { remoteCapabilityBaseUrl: "" } } });
  await service.proxyCapabilityRequest(
    { method: "GET" },
    createResponse(),
    new URL("http://localhost/api/remote?path=/api/health")
  );
  assert.deepEqual(sent, [{ status: 400, payload: { error: "Remote capability baseUrl is required" } }]);
}

{
  const { service, sent } = createService();
  await service.proxyCapabilityRequest(
    { method: "GET" },
    createResponse(),
    new URL("http://localhost/api/remote?baseUrl=https://remote.example&path=/bad")
  );
  assert.deepEqual(sent, [{ status: 400, payload: { error: "Remote capability path must start with /api/" } }]);
}

{
  const { service, sent, parsed, fetchCalls } = createService();
  const res = createResponse();
  await service.proxyCapabilityRequest(
    { method: "GET", body: { ignored: true } },
    res,
    new URL("http://localhost/api/remote?baseUrl=https://override.example/&path=/api/health?x=1")
  );
  assert.deepEqual(sent, []);
  assert.deepEqual(parsed, []);
  assert.equal(fetchCalls[0][0], "timeout");
  assert.equal(fetchCalls[1][0], "https://override.example/api/health?x=1");
  assert.equal(fetchCalls[1][1].method, "GET");
  assert.equal(fetchCalls[1][1].body, undefined);
  assert.deepEqual(fetchCalls.at(-1), ["clear", 7]);
  assert.equal(res.status, 201);
  assert.equal(res.headers["content-type"], "application/json");
  assert.equal(res.headers["cache-control"], "max-age=10");
  assert.deepEqual(res.body, Buffer.from("remote-body"));
}

{
  const { service, parsed, fetchCalls } = createService();
  await service.proxyCapabilityRequest(
    { method: "POST", body: { message: "hi" } },
    createResponse(),
    new URL("http://localhost/api/remote?path=/api/chat")
  );
  assert.deepEqual(parsed, [{ message: "hi" }]);
  assert.equal(fetchCalls[1][0], "https://remote.example/api/chat");
  assert.equal(fetchCalls[1][1].method, "POST");
  assert.equal(fetchCalls[1][1].body, JSON.stringify({ message: "hi" }));
}

{
  const { service, sent } = createService({ fetchError: new Error("network down") });
  await service.proxyCapabilityRequest(
    { method: "POST", body: { message: "hi" } },
    createResponse(),
    new URL("http://localhost/api/remote?path=/api/chat")
  );
  assert.equal(sent[0].status, 504);
  assert.equal(sent[0].payload.error, "Remote capability request failed");
  assert.equal(sent[0].payload.message, "network down");
  assert.equal(sent[0].payload.target, "https://remote.example/api/chat");
}

console.log("remote-capability-service tests passed");
