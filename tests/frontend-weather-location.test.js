import assert from "node:assert/strict";
import {
  createWeatherLocationController,
  normalizeClientLocation
} from "../public/modules/weatherLocation.js";

assert.deepEqual(normalizeClientLocation({ latitude: 31.230391, longitude: 121.473701 }), {
  lat: 31.23039,
  lon: 121.4737
});
assert.deepEqual(normalizeClientLocation({ lat: "40.123456", lng: "-73.987654" }), {
  lat: 40.12346,
  lon: -73.98765
});
assert.equal(normalizeClientLocation({ lat: 91, lon: 10 }), null);
assert.equal(normalizeClientLocation({ lat: 10, lon: 181 }), null);
assert.equal(normalizeClientLocation(null), null);

const storage = new Map();
const writes = [];
const controller = createWeatherLocationController({
  navigatorRef: {
    geolocation: {
      getCurrentPosition(success) {
        success({ coords: { latitude: 30.111111, longitude: 120.222222 } });
      }
    }
  },
  readStorage: (key) => storage.get(key) || "",
  writeStorage: (key, value) => {
    writes.push([key, value]);
    storage.set(key, value);
  },
  setTimeoutFn: (callback) => {
    callback();
    return 1;
  }
});

const located = await controller.request();
assert.deepEqual(located, { lat: 30.11111, lon: 120.22222 });
assert.deepEqual(controller.getLocation(), located);
assert.equal(writes[0][0], "claudio-weather-location");
assert.equal(controller.appendQuery("/api/now?insight=0"), "/api/now?insight=0&lat=30.11111&lon=120.22222");
assert.deepEqual(controller.withBody({ message: "hi" }), {
  message: "hi",
  location: { lat: 30.11111, lon: 120.22222 }
});

{
  const nativeWrites = [];
  const statuses = [];
  const nativeController = createWeatherLocationController({
    geolocationPlugin: {
      async checkPermissions() {
        return { location: "prompt" };
      },
      async requestPermissions() {
        statuses.push("requested");
        return { location: "granted" };
      },
      async getCurrentPosition() {
        return { coords: { latitude: 22.543096, longitude: 114.057865 } };
      }
    },
    navigatorRef: null,
    readStorage: () => "",
    writeStorage: (key, value) => nativeWrites.push([key, value]),
    setTimeoutFn: (callback) => {
      callback();
      return 1;
    },
    onStatus: (message) => statuses.push(message)
  });

  const nativeLocated = await nativeController.request();

  assert.deepEqual(nativeLocated, { lat: 22.5431, lon: 114.05787 });
  assert.equal(nativeWrites[0][0], "claudio-weather-location");
  assert.ok(statuses.includes("正在请求手机定位权限..."));
  assert.ok(statuses.includes("已获取当前位置，天气会按本地更新。"));
}

{
  const statuses = [];
  const deniedController = createWeatherLocationController({
    geolocationPlugin: {
      async checkPermissions() {
        return { location: "denied" };
      },
      async getCurrentPosition() {
        throw new Error("should not request position after denied permission");
      }
    },
    navigatorRef: null,
    readStorage: () => "",
    writeStorage: () => {},
    setTimeoutFn: (callback) => {
      callback();
      return 1;
    },
    onStatus: (message) => statuses.push(message)
  });

  assert.equal(await deniedController.request(), null);
  assert.equal(statuses.at(-1), "定位权限未开启，天气会使用默认城市。");
}

console.log("frontend-weather-location tests passed");
