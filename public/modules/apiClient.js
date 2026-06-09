const defaultRemoteCapabilityPaths = new Set(["/api/capabilities", "/api/insight", "/api/chat", "/api/voice", "/api/prewarm"]);
const defaultLocalCapabilityPaths = new Set([
  "/api/capabilities",
  "/api/health",
  "/api/insight",
  "/api/chat",
  "/api/voice",
  "/api/prewarm",
  "/api/settings",
  "/api/weather",
  "/api/now"
]);

export function createRemoteCapabilityBaseUrl(search = "", writeStorage = () => {}, readStorage = () => "") {
  const fromQuery = new URLSearchParams(search).get("api");
  if (fromQuery !== null) {
    const normalized = fromQuery.replace(/\/$/, "");
    writeStorage("claudio-remote-api", normalized);
    return normalized;
  }
  return String(readStorage("claudio-remote-api") || "").replace(/\/$/, "");
}

export function createApiClient({
  remoteCapabilityBaseUrl = "",
  remoteCapabilityPaths = defaultRemoteCapabilityPaths,
  localCapabilityBaseUrl = "",
  localCapabilityPaths = defaultLocalCapabilityPaths,
  appendWeatherLocationQuery = (path) => path,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  setTimeoutFn = globalThis.window?.setTimeout?.bind(globalThis.window) || globalThis.setTimeout?.bind(globalThis),
  clearTimeoutFn = globalThis.window?.clearTimeout?.bind(globalThis.window) || globalThis.clearTimeout?.bind(globalThis)
} = {}) {
  function getRemoteProxyUrl(path) {
    const params = new URLSearchParams({
      baseUrl: remoteCapabilityBaseUrl,
      path
    });
    return `/api/remote?${params}`;
  }

  function getApiUrl(path) {
    const pathname = path.split("?")[0];
    if (remoteCapabilityBaseUrl) {
      if (!remoteCapabilityPaths.has(pathname) && !pathname.startsWith("/api/cache/voice/")) return path;
      return getRemoteProxyUrl(path);
    }
    if (localCapabilityBaseUrl && localCapabilityPaths.has(pathname)) {
      return `${localCapabilityBaseUrl}${path}`;
    }
    return path;
  }

  function resolveApiAssetUrl(url) {
    if (!url || !remoteCapabilityBaseUrl || !url.startsWith("/api/")) return url;
    return getRemoteProxyUrl(url);
  }

  function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeoutFn ? setTimeoutFn(() => controller.abort(), timeoutMs) : null;
    return fetchImpl(url, {
      ...options,
      signal: controller.signal
    }).finally(() => {
      if (timer && clearTimeoutFn) clearTimeoutFn(timer);
    });
  }

  function normalizeRequestBody(body) {
    if (!body || typeof body !== "object") return body;
    if (
      body instanceof ArrayBuffer ||
      ArrayBuffer.isView(body) ||
      body instanceof Blob ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof ReadableStream
    ) {
      return body;
    }
    return JSON.stringify(body);
  }

  async function api(path, options = {}) {
    const pathWithLocation =
      options.weatherLocationQuery === false ? path : appendWeatherLocationQuery(path);
    const url = getApiUrl(pathWithLocation);
    const timeoutMs = Number(options.timeoutMs || 0);
    const controller = timeoutMs ? new AbortController() : null;
    const timer = timeoutMs && setTimeoutFn ? setTimeoutFn(() => controller.abort(), timeoutMs) : null;
    const { timeoutMs: _timeoutMs, signal, weatherLocationQuery: _weatherLocationQuery, ...fetchOptions } = options;
    fetchOptions.body = normalizeRequestBody(fetchOptions.body);
    const combinedSignal = signal || controller?.signal;
    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          "content-type": "application/json"
        },
        ...fetchOptions,
        signal: combinedSignal
      });
    } finally {
      if (timer && clearTimeoutFn) clearTimeoutFn(timer);
    }
    if (!response.ok) {
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      const error = new Error(payload?.error || `${path} ${response.status}`);
      error.status = response.status;
      error.code = payload?.code || "";
      error.payload = payload;
      throw error;
    }
    return response.json();
  }

  return {
    api,
    fetchWithTimeout,
    getApiUrl,
    getRemoteProxyUrl,
    resolveApiAssetUrl
  };
}
