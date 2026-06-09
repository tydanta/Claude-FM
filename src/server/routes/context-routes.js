export function registerContextRoutes(router, {
  getWeatherLocationFromSearch,
  buildNowPayload,
  getWeather,
  getSchedule,
  getTrackById,
  getTimeBlock,
  getInsightForTrack,
  normalizeWeatherLocation,
  getCurrentIndex,
  getTrackCount,
  prewarmQueue,
  parseBody,
  sendJson
}) {
  router.get("/api/now", async ({ res, url }) => {
    const includeInsight = url.searchParams.get("insight") !== "0";
    const location = getWeatherLocationFromSearch(url.searchParams);
    sendJson(res, 200, await buildNowPayload({ includeInsight, location }));
  });

  router.get("/api/weather", async ({ res, url }) => {
    const location = getWeatherLocationFromSearch(url.searchParams);
    const weather = await getWeather(location);
    sendJson(res, 200, {
      ok: true,
      weather
    });
  });

  router.get("/api/insight", async ({ res, url }) => {
    const location = getWeatherLocationFromSearch(url.searchParams);
    const weather = await getWeather(location);
    const schedule = await getSchedule();
    const track = getTrackById(url.searchParams.get("trackId"));
    const timeBlock = getTimeBlock();
    const voiceLanguage = url.searchParams.get("voiceLanguage") || "";
    const { insight, insightError } = await getInsightForTrack(track, weather, schedule, timeBlock, { voiceLanguage });
    sendJson(res, 200, {
      ok: true,
      trackId: track.id,
      insight,
      insightError,
      insightPending: false
    });
  });

  router.post("/api/prewarm", async ({ req, res }) => {
    const body = await parseBody(req);
    const location = normalizeWeatherLocation(body.location);
    const trackCount = getTrackCount();
    const startIndex = Number.isInteger(Number(body.startIndex))
      ? Math.max(0, Number(body.startIndex)) % trackCount
      : getCurrentIndex();
    const limit = Number.isInteger(Number(body.limit)) ? Number(body.limit) : 3;
    // 预热只准备候选曲目的天气、日程和 insight 上下文，不改变当前播放状态。
    const results = await prewarmQueue({ startIndex, limit, location });
    sendJson(res, 200, {
      ok: true,
      warmed: results
    });
  });
}
