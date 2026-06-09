export function normalizeClientLocation(location = {}) {
  if (!location || typeof location !== "object") return null;
  const lat = Number(location.lat ?? location.latitude);
  const lon = Number(location.lon ?? location.lng ?? location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return {
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5))
  };
}

export function createWeatherLocationController({
  geolocationPlugin = globalThis.Capacitor?.Plugins?.Geolocation,
  navigatorRef = navigator,
  readStorage,
  writeStorage,
  setTimeoutFn = window.setTimeout,
  onStatus = () => {},
  onFirstLocationRefresh = () => {}
}) {
  let location = readStoredLocation();
  let locationPromise = null;
  let refreshDone = false;

  function readStoredLocation() {
    try {
      return normalizeClientLocation(JSON.parse(readStorage("claudio-weather-location") || "null"));
    } catch {
      return null;
    }
  }

  function writeLocation(nextLocation) {
    const normalized = normalizeClientLocation(nextLocation);
    location = normalized;
    if (normalized) {
      writeStorage("claudio-weather-location", JSON.stringify(normalized));
    }
    return normalized;
  }

  function emitStatus(message) {
    if (message) onStatus(message);
  }

  function isPermissionGranted(value) {
    return value === "granted";
  }

  async function requestNativeLocation() {
    const plugin = geolocationPlugin;
    if (!plugin?.getCurrentPosition) return null;
    let permission = null;
    try {
      permission = plugin.checkPermissions ? await plugin.checkPermissions() : null;
    } catch {
      permission = null;
    }
    const locationPermission = permission?.location || permission?.coarseLocation;
    if (locationPermission === "denied") {
      emitStatus("定位权限未开启，天气会使用默认城市。");
      return location;
    }
    if (!isPermissionGranted(locationPermission) && plugin.requestPermissions) {
      emitStatus("正在请求手机定位权限...");
      try {
        permission = await plugin.requestPermissions();
      } catch {
        emitStatus("定位权限未开启，天气会使用默认城市。");
        return location;
      }
      const nextPermission = permission?.location || permission?.coarseLocation;
      if (!isPermissionGranted(nextPermission)) {
        emitStatus("定位权限未开启，天气会使用默认城市。");
        return location;
      }
    }
    try {
      const position = await plugin.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000
      });
      const nextLocation = writeLocation({
        lat: position.coords.latitude,
        lon: position.coords.longitude
      });
      if (nextLocation) emitStatus("已获取当前位置，天气会按本地更新。");
      return nextLocation;
    } catch {
      emitStatus("定位获取失败，天气会使用默认城市。");
      return location;
    }
  }

  function requestBrowserLocation() {
    if (!navigatorRef?.geolocation) {
      emitStatus("定位不可用，天气会使用默认城市。");
      return Promise.resolve(location);
    }
    emitStatus("正在请求手机定位权限...");
    return new Promise((resolve) => {
      navigatorRef.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = writeLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
          if (nextLocation) emitStatus("已获取当前位置，天气会按本地更新。");
          resolve(nextLocation);
        },
        () => {
          emitStatus("定位权限未开启，天气会使用默认城市。");
          resolve(location);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 10 * 60 * 1000
        }
      );
    });
  }

  function request() {
    if (locationPromise) return locationPromise;
    location = readStoredLocation();
    locationPromise = (geolocationPlugin?.getCurrentPosition
      ? requestNativeLocation()
      : requestBrowserLocation()
    );
    return locationPromise;
  }

  function requestSoon(timeoutMs = 2500) {
    const pendingLocation = request().then((nextLocation) => {
      if (nextLocation && !refreshDone) {
        refreshDone = true;
        onFirstLocationRefresh(nextLocation);
      }
      return nextLocation;
    });
    return Promise.race([
      pendingLocation,
      new Promise((resolve) => setTimeoutFn(() => resolve(location), timeoutMs))
    ]);
  }

  function appendQuery(path) {
    if (!location) return path;
    const normalized = normalizeClientLocation(location);
    if (!normalized) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}lat=${encodeURIComponent(normalized.lat)}&lon=${encodeURIComponent(normalized.lon)}`;
  }

  function withBody(body = {}) {
    const normalized = normalizeClientLocation(location);
    return normalized ? { ...body, location: normalized } : body;
  }

  return {
    appendQuery,
    getLocation: () => location,
    request,
    requestSoon,
    withBody,
    writeLocation
  };
}
