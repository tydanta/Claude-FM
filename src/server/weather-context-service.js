export function createWeatherContextService({ weatherService }) {
  function getTimeBlock(date = new Date()) {
    const hour = date.getHours();
    if (hour < 6) return "late-night";
    if (hour < 11) return "morning";
    if (hour < 14) return "noon";
    if (hour < 18) return "afternoon";
    if (hour < 22) return "evening";
    return "night";
  }

  function normalizeWeatherLocation(location = null) {
    if (!location || typeof location !== "object") return null;
    const lat = Number(location.lat ?? location.latitude);
    const lon = Number(location.lon ?? location.lng ?? location.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return {
      lat,
      lon,
      qweatherLocation: `${lon.toFixed(2)},${lat.toFixed(2)}`
    };
  }

  function getWeatherLocationFromSearch(searchParams) {
    return normalizeWeatherLocation({
      lat: searchParams.get("lat"),
      lon: searchParams.get("lon") || searchParams.get("lng")
    });
  }

  async function getWeather(location = null) {
    const normalizedLocation = normalizeWeatherLocation(location);
    return weatherService.getWeather(normalizedLocation);
  }

  return {
    getTimeBlock,
    normalizeWeatherLocation,
    getWeatherLocationFromSearch,
    getWeather
  };
}
