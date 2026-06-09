import http from "node:http";

export function createAppHttpService({
  config,
  apiRouter,
  publicDir,
  applyCorsHeaders,
  sendJson,
  serveStatic,
  loadPersistedState,
  beforeStart = async () => {},
  scheduleCacheCleanup,
  createServer = (handler) => http.createServer(handler),
  log = console.log
}) {
  async function handleApi(req, res, url) {
    if (await apiRouter.handle({ req, res, url })) return;
    sendJson(res, 404, { error: "API route not found" });
  }

  const server = createServer(async (req, res) => {
    try {
      applyCorsHeaders(req, res, config.corsOrigins);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url);
        return;
      }
      serveStatic(req, res, url, publicDir);
    } catch (error) {
      sendJson(res, 500, {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  async function startServer() {
    await beforeStart();
    await loadPersistedState();
    scheduleCacheCleanup();

    return new Promise((resolve) => {
      server.listen(config.port, () => {
        log(`Claude Private FM is running at http://localhost:${config.port}`);
        resolve(server);
      });
    });
  }

  return {
    server,
    handleApi,
    startServer
  };
}
