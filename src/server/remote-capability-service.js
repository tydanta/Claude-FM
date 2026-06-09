export function createRemoteCapabilityService({
  config,
  parseBody,
  sendJson,
  fetchImpl = fetch,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  AbortControllerImpl = AbortController
}) {
  async function proxyCapabilityRequest(req, res, url) {
    const baseUrl = (url.searchParams.get("baseUrl") || config.remoteCapabilityBaseUrl).replace(/\/$/, "");
    const targetPath = url.searchParams.get("path") || "";
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      sendJson(res, 400, { error: "Remote capability baseUrl is required" });
      return;
    }
    if (!targetPath.startsWith("/api/")) {
      sendJson(res, 400, { error: "Remote capability path must start with /api/" });
      return;
    }

    const target = new URL(targetPath, baseUrl);
    const body = ["GET", "HEAD"].includes(req.method || "") ? undefined : JSON.stringify(await parseBody(req));
    const controller = new AbortControllerImpl();
    const timer = setTimeoutFn(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetchImpl(target, {
        method: req.method,
        headers: {
          "content-type": "application/json"
        },
        body,
        signal: controller.signal
      });
    } catch (error) {
      sendJson(res, 504, {
        error: "Remote capability request failed",
        message: error instanceof Error ? error.message : String(error),
        target: target.toString()
      });
      return;
    } finally {
      clearTimeoutFn(timer);
    }
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const cacheControl = response.headers.get("cache-control") || "no-store";
    res.writeHead(response.status, {
      "content-type": contentType,
      "cache-control": cacheControl
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  }

  return {
    proxyCapabilityRequest
  };
}
