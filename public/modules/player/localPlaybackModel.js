export function createLocalPlaybackModel(model = null) {
  return {
    ...(model || {}),
    state: {
      volume: 0.8,
      position: 0,
      preferences: {},
      playback: {},
      ...(model?.state || {})
    },
    weather: {
      tempC: "--",
      summary: "clear",
      ...(model?.weather || {})
    },
    integrations: {
      ...(model?.integrations || {})
    },
    queue: Array.isArray(model?.queue) ? model.queue : [],
    djLine: model?.djLine || ""
  };
}
