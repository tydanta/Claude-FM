function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseCookiePairs(cookieText = "") {
  const pairs = new Map();
  String(cookieText || "")
    .split(/,(?=\s*[^;,=]+=)|;\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [key, ...rest] = part.split("=");
      const name = key?.trim();
      if (!name || /^(Max-Age|Expires|Path|Domain|SameSite|Secure|HttpOnly)$/i.test(name)) return;
      pairs.set(name, `${name}=${rest.join("=").trim()}`);
    });
  return pairs;
}

function normalizeBaseUrl(value = "") {
  return String(value || "").replace(/\/$/, "");
}

export function createNeteaseAuthService({
  config,
  getKv,
  setKv,
  clearNeteaseUrlCache = () => 0
}) {
  function migrateNeteaseApiBaseUrl() {
    const current = normalizeBaseUrl(config.neteaseApiBaseUrl);
    const stored = normalizeBaseUrl(getKv("netease.apiBaseUrl", ""));
    const hasStoredAuth = Boolean(getKv("netease.cookie", "") || getKv("netease.profile", ""));
    const shouldResetAuth = (stored && stored !== current) || (!stored && hasStoredAuth);
    if (shouldResetAuth) {
      setKv("netease.cookie", "");
      setKv("netease.profile", "null");
      clearNeteaseUrlCache();
    }
    if (current) setKv("netease.apiBaseUrl", current);
  }

  function getNeteaseCookie() {
    return getKv("netease.cookie", config.neteaseCookie || "");
  }

  function hasNeteaseLoginCookie(cookie = getNeteaseCookie()) {
    return /(?:^|;\s*)(MUSIC_U|MUSIC_A)=/.test(String(cookie || ""));
  }

  function setNeteaseCookie(cookie) {
    const value = Array.isArray(cookie) ? cookie.join("; ") : String(cookie || "");
    if (!value) return "";
    const existing = parseCookiePairs(getNeteaseCookie());
    const incoming = parseCookiePairs(value);
    incoming.forEach((pair, key) => existing.set(key, pair));
    const merged = [...existing.values()].join("; ");
    config.neteaseCookie = merged;
    setKv("netease.cookie", merged);
    return merged;
  }

  function getStoredNeteaseProfile() {
    return parseJson(getKv("netease.profile", "null"), null);
  }

  return {
    migrateNeteaseApiBaseUrl,
    getNeteaseCookie,
    hasNeteaseLoginCookie,
    setNeteaseCookie,
    getStoredNeteaseProfile
  };
}
