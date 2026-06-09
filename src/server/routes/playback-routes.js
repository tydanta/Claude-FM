export function registerPlaybackRoutes(router, {
  state,
  getTrackCount,
  readPlaybackState,
  savePlaybackState,
  savePersistedState,
  normalizeWeatherLocation,
  buildNowPayload,
  parseBody,
  sendJson
}) {
  router.get("/api/playback", async ({ res }) => {
    sendJson(res, 200, {
      ok: true,
      playback: readPlaybackState()
    });
  });

  router.post("/api/playback", async ({ req, res }) => {
    const body = await parseBody(req);
    savePlaybackState(body);
    sendJson(res, 200, {
      ok: true,
      playback: readPlaybackState()
    });
  });

  router.post("/api/state", async ({ req, res }) => {
    const body = await parseBody(req);
    Object.assign(state, {
      isPlaying: typeof body.isPlaying === "boolean" ? body.isPlaying : state.isPlaying,
      volume: typeof body.volume === "number" ? body.volume : state.volume,
      speed: typeof body.speed === "number" ? body.speed : state.speed
    });
    await savePersistedState();
    sendJson(res, 200, state);
  });

  router.post("/api/next", async ({ req, res }) => {
    const body = await parseBody(req);
    const location = normalizeWeatherLocation(body.location);
    // 播放控制是即时交互：先更新内存状态，再持久化，最后返回最新 now payload。
    state.currentIndex = (state.currentIndex + 1) % getTrackCount();
    state.isPlaying = true;
    await savePersistedState();
    sendJson(res, 200, await buildNowPayload({ includeInsight: false, location }));
  });

  router.post("/api/previous", async ({ req, res }) => {
    const body = await parseBody(req);
    const location = normalizeWeatherLocation(body.location);
    const trackCount = getTrackCount();
    state.currentIndex = (state.currentIndex - 1 + trackCount) % trackCount;
    state.isPlaying = true;
    await savePersistedState();
    sendJson(res, 200, await buildNowPayload({ includeInsight: false, location }));
  });

  router.post("/api/select", async ({ req, res }) => {
    const body = await parseBody(req);
    const location = normalizeWeatherLocation(body.location);
    const index = Number(body.index);
    if (!Number.isInteger(index) || index < 0 || index >= getTrackCount()) {
      sendJson(res, 400, { error: "Invalid track index" });
      return;
    }
    state.currentIndex = index;
    state.isPlaying = true;
    await savePersistedState();
    sendJson(res, 200, await buildNowPayload({ includeInsight: false, location }));
  });

  router.post("/api/taste", async ({ req, res }) => {
    const body = await parseBody(req);
    state.preferences = { ...state.preferences, ...body };
    await savePersistedState();
    sendJson(res, 200, {
      ok: true,
      preferences: state.preferences
    });
  });
}
