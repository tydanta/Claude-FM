export const androidNeteaseBaseUrl = "http://127.0.0.1:3010";
export const androidMediaProxyBaseUrl = "http://127.0.0.1:3011";
export const androidCapabilityBaseUrl = "http://127.0.0.1:3012";

export function isAndroidRuntime() {
  const capacitor = globalThis.Capacitor;
  return Boolean(
    globalThis.cordova ||
    globalThis.nodejs ||
    capacitor?.getPlatform?.() === "android" ||
    capacitor?.platform === "android" ||
    (capacitor?.isNativePlatform?.() && /android/i.test(globalThis.navigator?.userAgent || ""))
  );
}

export function isLocalAppRuntime() {
  return isAndroidRuntime();
}
