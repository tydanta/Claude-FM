import assert from "node:assert/strict";
import { createAppAdapterEndpointService } from "../src/server/app-adapter-endpoint-service.js";

{
  const service = createAppAdapterEndpointService({
    config: {
      openaiBaseUrl: "https://openai.example/v1",
      openaiChatPath: "chat/completions"
    },
    neteaseAdapter: { request: async () => ({ ok: true }) }
  });
  assert.equal(service.getOpenAIChatUrl(), "https://openai.example/v1/chat/completions");
}

{
  const service = createAppAdapterEndpointService({
    config: {
      openaiBaseUrl: "https://openai.example/v1",
      openaiChatPath: "/responses"
    },
    neteaseAdapter: { request: async () => ({ ok: true }) }
  });
  assert.equal(service.getOpenAIChatUrl(), "https://openai.example/v1/responses");
}

{
  const calls = [];
  const service = createAppAdapterEndpointService({
    config: {
      openaiBaseUrl: "https://openai.example",
      openaiChatPath: "/chat"
    },
    neteaseAdapter: {
      request: async (pathname, params, options) => {
        calls.push([pathname, params, options]);
        return { code: 200, pathname, params, options };
      }
    }
  });
  const result = await service.neteaseRequest(
    "/playlist/detail",
    { id: "pl-1" },
    { method: "POST", auth: true, rawBody: "raw=1" }
  );
  assert.deepEqual(calls, [[
    "/playlist/detail",
    { id: "pl-1" },
    { method: "POST", auth: true, rawBody: "raw=1" }
  ]]);
  assert.equal(result.pathname, "/playlist/detail");
}

{
  const calls = [];
  const service = createAppAdapterEndpointService({
    config: {
      openaiBaseUrl: "https://openai.example",
      openaiChatPath: "/chat"
    },
    neteaseAdapter: {
      request: async (pathname, params, options) => {
        calls.push([pathname, params, options]);
        return { ok: true };
      }
    }
  });
  await service.neteaseRequest("/login/status");
  assert.deepEqual(calls, [["/login/status", {}, { method: "GET", auth: false, rawBody: null }]]);
}

console.log("app-adapter-endpoint-service tests passed");
