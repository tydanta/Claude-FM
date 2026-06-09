export function renderClock({
  clock,
  weekday,
  now = new Date()
}) {
  if (clock) {
    clock.textContent = now.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
  if (weekday) {
    weekday.textContent = now.toLocaleDateString("en-US", { weekday: "long" });
  }
}

export function getWeatherIconType(summary = "") {
  if (/雨|rain|shower/i.test(summary)) return "rain";
  if (/阴|雾|霾|overcast|haze|mist|fog/i.test(summary)) return "overcast";
  if (/晴|clear|sun/i.test(summary)) return "clear";
  return "cloudy";
}

export function renderWeatherIcon(target, type = "cloudy") {
  if (!target) return;
  const icons = {
    clear: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <circle cx="12" cy="12" r="4"></circle>
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
      </svg>
    `,
    cloudy: `
      <svg class="weather-cloud" viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M17.5 19H8a5 5 0 1 1 1.3-9.83A6 6 0 0 1 20 12.5a3.5 3.5 0 0 1-2.5 6.5Z"></path>
      </svg>
    `,
    overcast: `
      <svg class="weather-overcast" viewBox="0 0 24 24" role="img" focusable="false">
        <path d="M16.5 18H7.8a4.3 4.3 0 1 1 1.1-8.45A5.2 5.2 0 0 1 18.8 12a3.1 3.1 0 0 1-2.3 6Z"></path>
        <path d="M6 15h13"></path>
      </svg>
    `,
    rain: `
      <svg viewBox="0 0 24 24" role="img" focusable="false">
        <path class="weather-cloud" d="M17.5 16H8a5 5 0 1 1 1.3-9.83A6 6 0 0 1 20 9.5a3.5 3.5 0 0 1-2.5 6.5Z"></path>
        <path class="weather-rain" d="M9 19v2M13 19v2M17 19v2"></path>
      </svg>
    `
  };
  target.innerHTML = icons[type] || icons.cloudy;
}
