export function registerSettingsRoutes(router, {
  getEditableSettings,
  saveRuntimeSettings,
  parseBody,
  sendJson
}) {
  router.get("/api/settings", async ({ res, url }) => {
    const revealSecrets = url.searchParams.get("reveal") === "1";
    sendJson(res, 200, {
      ok: true,
      settings: getEditableSettings({ revealSecrets })
    });
  });

  router.post("/api/settings", async ({ req, res }) => {
    sendJson(res, 200, {
      ok: true,
      settings: await saveRuntimeSettings(await parseBody(req))
    });
  });
}
