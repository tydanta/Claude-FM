export function registerMediaRoutes(router, {
  mediaCache,
  parseBody,
  sendJson
}) {
  router.get("/api/media/cover", async ({ req, res, url }) => {
    await mediaCache.serveCover(req, res, url);
  });

  router.get("/api/media/audio", async ({ req, res, url }) => {
    await mediaCache.serveAudio(req, res, url);
  });

  router.post("/api/media/preload-covers", async ({ req, res }) => {
    sendJson(res, 200, await mediaCache.preloadCovers(await parseBody(req)));
  });

  router.post("/api/media/preload-audio", async ({ req, res }) => {
    sendJson(res, 200, await mediaCache.preloadAudio(await parseBody(req)));
  });
}
