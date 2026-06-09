export function normalizeNeteaseAudioLevel(level = "") {
  const value = String(level || "").trim().toLowerCase();
  const allowed = new Set(["standard", "higher", "exhigh", "lossless", "hires", "jyeffect", "sky", "jymaster"]);
  return allowed.has(value) ? value : "standard";
}

export function createNeteaseAdapter({
  config,
  getCookie = () => "",
  setCookie = () => {},
  fetchImpl = fetch,
  now = Date.now
}) {
  async function request(pathname, params = {}, { method = "GET", auth = false, rawBody = null } = {}) {
    const url = new URL(pathname, config.neteaseApiBaseUrl);
    const payload = {
      ...(params || {}),
      timestamp: params.timestamp || now()
    };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === null || payload[key] === "") delete payload[key];
    });
    if (config.neteaseRealIP && !payload.realIP) payload.realIP = config.neteaseRealIP;
    const cookie = getCookie();
    if (auth && cookie && !payload.cookie) payload.cookie = cookie;
    const isGet = String(method || "GET").toUpperCase() === "GET";
    if (isGet) {
      Object.entries(payload).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1200, Number(config.neteaseApiTimeoutMs) || 4500));
    let response;
    try {
      const fetchOptions = {
        method: isGet ? "GET" : String(method || "GET").toUpperCase(),
        headers: { "content-type": "application/json" },
        signal: controller.signal
      };
      if (!isGet) fetchOptions.body = rawBody ?? JSON.stringify(payload);
      response = await fetchImpl(url, fetchOptions);
    } finally {
      clearTimeout(timer);
    }
    const body = await response.json().catch(async () => ({
      code: response.status,
      message: await response.text().catch(() => "")
    }));
    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) setCookie(setCookieHeader);
    if (!response.ok || (body.code && ![200, 800, 801, 802, 803].includes(Number(body.code)))) {
      throw new Error(`Netease ${pathname} failed: ${response.status} ${body.code || ""} ${body.message || ""}`.trim());
    }
    // 网易云部分接口会把 cookie 放进 JSON；这里统一回写，路由层只关心业务数据。
    if (body.cookie) setCookie(body.cookie);
    return body;
  }

  return { request };
}
