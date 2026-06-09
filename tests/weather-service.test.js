import assert from "node:assert/strict";
import { createWeatherService } from "../src/server/weather-service.js";

const noKeyWeather = createWeatherService({
  config: { weatherCity: "杭州", qweatherApiKey: "", qweatherApiHost: "devapi.qweather.com", qweatherLocation: "120.00,30.00" }
});
assert.deepEqual(await noKeyWeather.getWeather(null), {
  provider: "mock",
  city: "杭州",
  summary: "多云",
  tempC: 24,
  humidity: 66,
  location: null
});

const successWeather = createWeatherService({
  config: { weatherCity: "杭州", qweatherApiKey: "key", qweatherApiHost: "devapi.qweather.com", qweatherLocation: "120.00,30.00" },
  fetchImpl: async (url, options) => {
    assert.equal(String(url), "https://devapi.qweather.com/v7/weather/now?location=121.12%2C31.57&lang=zh");
    assert.equal(options.headers["X-QW-Api-Key"], "key");
    return {
      ok: true,
      json: async () => ({
        code: "200",
        updateTime: "2026-06-03T10:00+08:00",
        now: { text: "晴", temp: "27.4", humidity: "55", icon: "100", windDir: "东风", windScale: "3", obsTime: "2026-06-03T09:55+08:00" }
      })
    };
  }
});
assert.deepEqual(await successWeather.getWeather({
  lat: 31.567,
  lon: 121.123,
  qweatherLocation: "121.12,31.57"
}), {
  provider: "qweather",
  city: "当前位置",
  summary: "晴",
  tempC: 27,
  humidity: 55,
  icon: "100",
  windDir: "东风",
  windScale: "3",
  observedAt: "2026-06-03T09:55+08:00",
  location: { lat: 31.567, lon: 121.123 }
});

const fallbackWeather = createWeatherService({
  config: { weatherCity: "杭州", qweatherApiKey: "key", qweatherApiHost: "devapi.qweather.com", qweatherLocation: "120.00,30.00" },
  fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
  logger: { warn() {} }
});
assert.equal((await fallbackWeather.getWeather(null)).provider, "qweather-fallback");

console.log("weather-service tests passed");
