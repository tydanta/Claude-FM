export function createWeatherService({ config, fetchImpl = fetch, logger = console }) {
  function fallbackWeather(location = null, provider = "mock") {
    return {
      provider,
      city: location ? "当前位置" : config.weatherCity,
      summary: "多云",
      tempC: 24,
      humidity: 66,
      location: location ? { lat: location.lat, lon: location.lon } : null
    };
  }

  async function getWeather(location = null) {
    if (!config.qweatherApiKey) {
      return fallbackWeather(location);
    }

    try {
      const url = new URL(`https://${config.qweatherApiHost}/v7/weather/now`);
      url.searchParams.set("location", location?.qweatherLocation || config.qweatherLocation);
      url.searchParams.set("lang", "zh");

      const response = await fetchImpl(url, {
        headers: {
          "X-QW-Api-Key": config.qweatherApiKey
        }
      });
      if (!response.ok) throw new Error(`QWeather failed: ${response.status}`);
      const data = await response.json();
      if (data.code !== "200") {
        throw new Error(`QWeather failed: ${data.code || "unknown"}`);
      }
      const now = data.now || {};
      return {
        provider: "qweather",
        city: location ? "当前位置" : config.weatherCity,
        summary: now.text || "未知",
        tempC: Math.round(Number(now.temp ?? 0)),
        humidity: now.humidity !== undefined ? Number(now.humidity) : null,
        icon: now.icon || "",
        windDir: now.windDir || "",
        windScale: now.windScale || "",
        observedAt: now.obsTime || data.updateTime || "",
        location: location ? { lat: location.lat, lon: location.lon } : null
      };
    } catch (error) {
      logger.warn(error instanceof Error ? error.message : error);
      // 天气不是核心播放链路，失败时用本地 fallback 保持电台和 insight 继续工作。
      return fallbackWeather(location, "qweather-fallback");
    }
  }

  return { getWeather };
}
