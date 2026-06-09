import assert from "node:assert/strict";
import { createWeatherContextService } from "../src/server/weather-context-service.js";

const calls = [];
const service = createWeatherContextService({
  weatherService: {
    getWeather: async (location) => {
      calls.push(location);
      return { ok: true, location };
    }
  }
});

assert.equal(service.getTimeBlock(new Date("2026-06-05T05:59:00")), "late-night");
assert.equal(service.getTimeBlock(new Date("2026-06-05T06:00:00")), "morning");
assert.equal(service.getTimeBlock(new Date("2026-06-05T10:59:00")), "morning");
assert.equal(service.getTimeBlock(new Date("2026-06-05T11:00:00")), "noon");
assert.equal(service.getTimeBlock(new Date("2026-06-05T13:59:00")), "noon");
assert.equal(service.getTimeBlock(new Date("2026-06-05T14:00:00")), "afternoon");
assert.equal(service.getTimeBlock(new Date("2026-06-05T17:59:00")), "afternoon");
assert.equal(service.getTimeBlock(new Date("2026-06-05T18:00:00")), "evening");
assert.equal(service.getTimeBlock(new Date("2026-06-05T21:59:00")), "evening");
assert.equal(service.getTimeBlock(new Date("2026-06-05T22:00:00")), "night");

assert.deepEqual(service.normalizeWeatherLocation({ lat: "31.567", lon: "121.123" }), {
  lat: 31.567,
  lon: 121.123,
  qweatherLocation: "121.12,31.57"
});
assert.deepEqual(service.normalizeWeatherLocation({ latitude: 30, lng: 120 }), {
  lat: 30,
  lon: 120,
  qweatherLocation: "120.00,30.00"
});
assert.equal(service.normalizeWeatherLocation(null), null);
assert.equal(service.normalizeWeatherLocation("Shanghai"), null);
assert.equal(service.normalizeWeatherLocation({ lat: 91, lon: 120 }), null);
assert.equal(service.normalizeWeatherLocation({ lat: 30, lon: 181 }), null);
assert.equal(service.normalizeWeatherLocation({ lat: "x", lon: 120 }), null);

assert.deepEqual(
  service.getWeatherLocationFromSearch(new URLSearchParams("lat=31.5&lng=121.4")),
  { lat: 31.5, lon: 121.4, qweatherLocation: "121.40,31.50" }
);
assert.deepEqual(
  service.getWeatherLocationFromSearch(new URLSearchParams("lat=31.5&lon=121.3&lng=121.4")),
  { lat: 31.5, lon: 121.3, qweatherLocation: "121.30,31.50" }
);

assert.deepEqual(await service.getWeather({ latitude: 31.567, longitude: 121.123 }), {
  ok: true,
  location: { lat: 31.567, lon: 121.123, qweatherLocation: "121.12,31.57" }
});
assert.deepEqual(calls, [{ lat: 31.567, lon: 121.123, qweatherLocation: "121.12,31.57" }]);

console.log("weather-context-service tests passed");
