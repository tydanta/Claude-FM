import assert from "node:assert/strict";
import { createAppHttpService } from "../src/server/app-http-service.js";

function createHarness({ routerHandled = false, routeThrows = false } = {}) {
  const calls = [];
  const responses = [];
  let requestHandler = null;
  const fakeServer = {
    listen(port, callback) {
      calls.push(["listen", port]);
      callback();
    }
  };
  const service = createAppHttpService({
    config: { port: 3099, corsOrigins: ["http://localhost:3088"] },
    apiRouter: {
      handle: async (context) => {
        calls.push(["router", context.url.pathname]);
        if (routeThrows) throw new Error("route failed");
        return routerHandled;
      }
    },
    publicDir: "public-root",
    applyCorsHeaders: (req, res, origins) => calls.push(["cors", req.method, origins]),
    sendJson: (res, status, payload) => responses.push({ status, payload }),
    serveStatic: (req, res, url, publicDir) => calls.push(["static", url.pathname, publicDir]),
    createServer: (handler) => {
      requestHandler = handler;
      calls.push(["createServer"]);
      return fakeServer;
    },
    beforeStart: async () => calls.push(["beforeStart"]),
    loadPersistedState: async () => calls.push(["loadPersistedState"]),
    scheduleCacheCleanup: () => calls.push(["scheduleCacheCleanup"]),
    log: (message) => calls.push(["log", message])
  });
  return { calls, fakeServer, requestHandler: () => requestHandler, responses, service };
}

{
  const { calls, requestHandler, responses } = createHarness();
  await requestHandler()(
    { method: "GET", url: "/api/missing", headers: { host: "localhost" } },
    {}
  );
  assert.deepEqual(calls.slice(0, 2), [["createServer"], ["cors", "GET", ["http://localhost:3088"]]]);
  assert.deepEqual(calls[2], ["router", "/api/missing"]);
  assert.deepEqual(responses, [{ status: 404, payload: { error: "API route not found" } }]);
}

{
  const { calls, requestHandler, responses } = createHarness({ routerHandled: true });
  await requestHandler()(
    { method: "GET", url: "/api/health", headers: { host: "localhost" } },
    {}
  );
  assert.deepEqual(calls.find((call) => call[0] === "router"), ["router", "/api/health"]);
  assert.deepEqual(responses, []);
}

{
  const { calls, requestHandler } = createHarness();
  const res = {
    writeHead(status) {
      calls.push(["writeHead", status]);
    },
    end() {
      calls.push(["end"]);
    }
  };
  await requestHandler()(
    { method: "OPTIONS", url: "/api/health", headers: { host: "localhost" } },
    res
  );
  assert.deepEqual(calls.slice(1), [
    ["cors", "OPTIONS", ["http://localhost:3088"]],
    ["writeHead", 204],
    ["end"]
  ]);
}

{
  const { calls, requestHandler } = createHarness();
  await requestHandler()(
    { method: "GET", url: "/app.js", headers: { host: "localhost" } },
    {}
  );
  assert.deepEqual(calls.find((call) => call[0] === "static"), ["static", "/app.js", "public-root"]);
}

{
  const { requestHandler, responses } = createHarness({ routeThrows: true });
  await requestHandler()(
    { method: "GET", url: "/api/fail", headers: { host: "localhost" } },
    {}
  );
  assert.deepEqual(responses, [{
    status: 500,
    payload: { error: "Internal server error", message: "route failed" }
  }]);
}

{
  const { calls, service } = createHarness();
  const server = await service.startServer();
  assert.equal(server, service.server);
  assert.deepEqual(calls, [
    ["createServer"],
    ["beforeStart"],
    ["loadPersistedState"],
    ["scheduleCacheCleanup"],
    ["listen", 3099],
    ["log", "Claude Private FM is running at http://localhost:3099"]
  ]);
}

console.log("app-http-service tests passed");
