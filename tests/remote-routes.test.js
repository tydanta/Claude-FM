import assert from "node:assert/strict";
import { registerRemoteRoutes } from "../src/server/routes/remote-routes.js";
import { createRouter } from "../src/server/router.js";

const calls = [];
const router = createRouter();
registerRemoteRoutes(router, {
  proxyCapabilityRequest: async (req, res, url) => calls.push([req.method, url.searchParams.get("path")])
});

assert.equal(await router.handle({
  req: { method: "GET" },
  res: {},
  url: new URL("http://localhost/api/remote?path=/api/health")
}), true);
assert.equal(await router.handle({
  req: { method: "POST" },
  res: {},
  url: new URL("http://localhost/api/remote?path=/api/chat")
}), true);
assert.equal(await router.handle({
  req: { method: "DELETE" },
  res: {},
  url: new URL("http://localhost/api/remote?path=/api/chat")
}), false);
assert.deepEqual(calls, [["GET", "/api/health"], ["POST", "/api/chat"]]);

console.log("remote-routes tests passed");
