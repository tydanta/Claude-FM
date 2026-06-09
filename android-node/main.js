const http = require("http");
const https = require("https");
const { createClaudeCapabilityServer } = require("./api-service");

process.env.HOST = "127.0.0.1";
process.env.PORT = "3010";
process.env.NODE_ENV = "production";
process.env.NO_UPDATE_NOTIFIER = "1";

const mediaProxyPort = 3011;
const allowedMediaHost = /(^|\.)music\.126\.net$/i;

createClaudeCapabilityServer({ port: 3012, rootDir: process.cwd() }).start();

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,HEAD,OPTIONS",
    "access-control-allow-headers": "range,content-type"
  });
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(headers = {}) {
  return {
    ...headers,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,HEAD,OPTIONS",
    "access-control-allow-headers": "range,content-type",
    "cross-origin-resource-policy": "cross-origin"
  };
}

function getSafeMediaUrl(rawUrl) {
  const parsed = new URL(String(rawUrl || ""));
  if (!/^https?:$/.test(parsed.protocol) || !allowedMediaHost.test(parsed.hostname)) {
    throw new Error("Unsupported media URL");
  }
  if (parsed.protocol === "http:") parsed.protocol = "https:";
  return parsed;
}

function proxyMedia(req, res, targetUrl, redirects = 0) {
  const isAudioRequest = req.url.includes("/claude/media/audio");
  const client = targetUrl.protocol === "https:" ? https : http;
  const headers = {
    "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36",
    referer: "https://music.163.com/",
    accept: req.headers.accept || "*/*"
  };
  if (req.headers.range) headers.range = req.headers.range;

  const upstream = client.request(targetUrl, { method: req.method === "HEAD" ? "HEAD" : "GET", headers }, (upstreamRes) => {
    const status = upstreamRes.statusCode || 502;
    if (isAudioRequest) {
      console.log(`[MEDIA] audio ${status} range=${req.headers.range || ""} length=${upstreamRes.headers["content-length"] || ""} contentRange=${upstreamRes.headers["content-range"] || ""}`);
    }
    const location = upstreamRes.headers.location;
    if ([301, 302, 303, 307, 308].includes(status) && location && redirects < 5) {
      upstreamRes.resume();
      proxyMedia(req, res, new URL(location, targetUrl), redirects + 1);
      return;
    }
    const responseHeaders = setCorsHeaders({
      "content-type": upstreamRes.headers["content-type"] || "application/octet-stream",
      "accept-ranges": upstreamRes.headers["accept-ranges"] || "bytes",
      "cache-control": "no-store"
    });
    for (const name of ["content-length", "content-range", "last-modified", "etag"]) {
      if (upstreamRes.headers[name]) responseHeaders[name] = upstreamRes.headers[name];
    }
    res.writeHead(status, responseHeaders);
    upstreamRes.pipe(res);
  });

  upstream.on("error", (error) => {
    if (isAudioRequest) console.log(`[MEDIA] audio error ${error.message || error}`);
    if (!res.headersSent) sendJson(res, 502, { error: error.message || "Media proxy failed" });
    else res.destroy(error);
  });
  upstream.end();
}

http.createServer((req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, setCorsHeaders());
      res.end();
      return;
    }
    const requestUrl = new URL(req.url, `http://127.0.0.1:${mediaProxyPort}`);
    if (!requestUrl.pathname.startsWith("/claude/media/")) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const mediaUrl = getSafeMediaUrl(requestUrl.searchParams.get("url"));
    proxyMedia(req, res, mediaUrl);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "Bad media request" });
  }
}).listen(mediaProxyPort, "127.0.0.1", () => {
  console.log(`Claude FM media proxy running @ http://127.0.0.1:${mediaProxyPort}`);
});

require("NeteaseCloudMusicApi/app.js");
