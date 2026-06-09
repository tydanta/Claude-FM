export function registerRemoteRoutes(router, { proxyCapabilityRequest }) {
  router.get("/api/remote", async ({ req, res, url }) => {
    await proxyCapabilityRequest(req, res, url);
  });

  router.post("/api/remote", async ({ req, res, url }) => {
    await proxyCapabilityRequest(req, res, url);
  });
}
