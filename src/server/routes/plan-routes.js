export function registerPlanRoutes(router, {
  getTodayKey = () => new Date().toISOString().slice(0, 10),
  getSchedule,
  saveSchedule,
  parseBody,
  sendJson
}) {
  router.get("/api/plan/today", async ({ res }) => {
    sendJson(res, 200, {
      date: getTodayKey(),
      schedule: await getSchedule()
    });
  });

  router.post("/api/plan/today", async ({ req, res }) => {
    const body = await parseBody(req);
    const schedule = await saveSchedule(body.schedule);
    sendJson(res, 200, {
      ok: true,
      date: getTodayKey(),
      schedule
    });
  });
}
