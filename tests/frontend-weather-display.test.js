import assert from "node:assert/strict";
import {
  getWeatherIconType,
  renderClock,
  renderWeatherIcon
} from "../public/modules/ui/weatherDisplay.js";

assert.equal(getWeatherIconType("小雨"), "rain");
assert.equal(getWeatherIconType("rain shower"), "rain");
assert.equal(getWeatherIconType("雾霾"), "overcast");
assert.equal(getWeatherIconType("fog"), "overcast");
assert.equal(getWeatherIconType("晴朗"), "clear");
assert.equal(getWeatherIconType("sunny"), "clear");
assert.equal(getWeatherIconType("partly cloudy"), "cloudy");

const iconTarget = { innerHTML: "" };
renderWeatherIcon(iconTarget, "rain");
assert.match(iconTarget.innerHTML, /weather-rain/);
renderWeatherIcon(iconTarget, "unknown");
assert.match(iconTarget.innerHTML, /weather-cloud/);

const clock = { textContent: "" };
const weekday = { textContent: "" };
renderClock({
  clock,
  weekday,
  now: new Date("2026-06-04T09:07:00+08:00")
});
assert.match(clock.textContent, /^\d{2}:\d{2}$/);
assert.equal(weekday.textContent, "Thursday");

console.log("frontend-weather-display tests passed");
