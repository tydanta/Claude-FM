export function startAndroidNeteaseApi({
  globalObject = globalThis,
  documentObject = globalThis.document,
  logger = globalThis.console
} = {}) {
  if (!globalObject?.cordova && !globalObject?.nodejs) return false;
  if (globalObject.__claudeFmAndroidNeteaseApiStarted) return true;

  const start = () => {
    const nodejs = globalObject.nodejs;
    if (!nodejs?.start || globalObject.__claudeFmAndroidNeteaseApiStarted) return false;
    globalObject.__claudeFmAndroidNeteaseApiStarted = true;
    nodejs.start("main.js", (error) => {
      if (error) {
        globalObject.__claudeFmAndroidNeteaseApiStarted = false;
        logger?.warn?.("Android Netease API startup failed", error);
        return;
      }
      logger?.info?.("Android Netease API startup requested at http://127.0.0.1:3010");
    }, { redirectOutputToLogcat: true });
    return true;
  };

  if (start()) return true;
  documentObject?.addEventListener?.("deviceready", start, { once: true });
  return false;
}
