export function registerNeteaseLoginRoutes(router, {
  neteaseRequest,
  getStoredNeteaseProfile,
  getLocalNeteasePlaylists,
  hasNeteaseLoginCookie,
  getNeteaseCookie,
  setNeteaseCookie,
  setKv,
  parseBody,
  sendJson
}) {
  router.get("/api/netease/login/status", async ({ res }) => {
    const status = await neteaseRequest("/login/status", {}, { auth: true }).catch(() => null);
    const onlineProfile = status?.data?.profile || status?.profile || null;
    const storedProfile = getStoredNeteaseProfile();
    const profile = onlineProfile || storedProfile;
    const ownerUserId = String(profile?.userId || profile?.user?.userId || "");
    const cookieReady = hasNeteaseLoginCookie();
    if (onlineProfile?.userId) setKv("netease.profile", JSON.stringify(onlineProfile));
    sendJson(res, 200, {
      ok: true,
      loggedIn: Boolean(onlineProfile?.userId || cookieReady),
      offline: Boolean(!onlineProfile?.userId && !cookieReady && storedProfile?.userId),
      hasLocalData: getLocalNeteasePlaylists({ ownerUserId }).length > 0,
      profile,
      cookieReady
    });
  });

  router.post("/api/netease/login/qr/start", async ({ res }) => {
    const keyData = await neteaseRequest("/login/qr/key", {}, { method: "POST" });
    const key = keyData.data?.unikey || keyData.unikey;
    const qr = await neteaseRequest("/login/qr/create", { key, qrimg: true }, { method: "POST" });
    sendJson(res, 200, {
      ok: true,
      key,
      qrimg: qr.data?.qrimg || qr.qrimg || "",
      qrurl: qr.data?.qrurl || qr.qrurl || ""
    });
  });

  router.post("/api/netease/login/qr/check", async ({ req, res }) => {
    const body = await parseBody(req);
    const data = await checkNeteaseQrLogin({
      key: body.key,
      noCookie: body.noCookie,
      neteaseRequest,
      hasNeteaseLoginCookie,
      getNeteaseCookie
    });
    if (Number(data.code) === 803 && data.cookie) setNeteaseCookie(data.cookie);
    const cookieReady = hasNeteaseLoginCookie();
    let profile = null;
    if (Number(data.code) === 803 && cookieReady) {
      const status = await neteaseRequest("/login/status", {}, { auth: true }).catch(() => null);
      profile = status?.data?.profile || status?.profile || null;
      if (profile?.userId) setKv("netease.profile", JSON.stringify(profile));
    }
    sendJson(res, 200, {
      ok: true,
      code: data.code,
      message: data.message || "",
      cookieReady,
      loggedIn: Boolean(profile?.userId || cookieReady),
      profile
    });
  });

  router.post("/api/netease/login/password", async ({ req, res }) => {
    const body = await parseBody(req);
    const mode = body.mode === "email" ? "email" : "cellphone";
    const params = buildPasswordLoginParams(body, mode);
    if (!hasPasswordLoginCredential(params, mode)) {
      sendJson(res, 400, {
        ok: false,
        loggedIn: false,
        reason: "password-login-missing-fields",
        message: mode === "email" ? "Please enter email and password." : "Please enter phone and password."
      });
      return;
    }

    try {
      const endpoint = mode === "email" ? "/login" : "/login/cellphone";
      const data = await neteaseRequest(endpoint, params, { method: "POST" });
      if (!isPasswordLoginAccepted(data)) throw new Error("password-login-failed");
      if (data.cookie && hasNeteaseLoginCookie(data.cookie)) setNeteaseCookie(data.cookie);
      const status = await neteaseRequest("/login/status", {}, { auth: true }).catch(() => null);
      const profile = status?.data?.profile || status?.profile || data.profile || data.data?.profile || null;
      if (profile?.userId) setKv("netease.profile", JSON.stringify(profile));
      const cookieReady = hasNeteaseLoginCookie(data.cookie || getNeteaseCookie());
      sendJson(res, 200, {
        ok: true,
        loggedIn: Boolean(profile?.userId || cookieReady),
        cookieReady,
        profile
      });
    } catch {
      sendJson(res, 401, {
        ok: false,
        loggedIn: false,
        reason: "password-login-failed",
        message: "Netease login failed. Please check account, password, or captcha."
      });
    }
  });
}

async function checkNeteaseQrLogin({
  key,
  noCookie = false,
  neteaseRequest,
  hasNeteaseLoginCookie,
  getNeteaseCookie
}) {
  const check = (useNoCookie) => neteaseRequest(
    "/login/qr/check",
    { key, noCookie: useNoCookie ? "true" : "" },
    { method: "GET" }
  );
  if (noCookie) return check(true);
  let data;
  try {
    data = await check(false);
  } catch {
    // Some Netease deployments report QR success only through noCookie polling.
    data = await check(true);
  }
  if (Number(data.code) === 803 && !hasNeteaseLoginCookie(data.cookie || getNeteaseCookie())) {
    const retry = await check(true).catch(() => null);
    if (retry?.code) data = retry;
  }
  return data;
}

function buildPasswordLoginParams(body = {}, mode = "cellphone") {
  const password = String(body.password || "").trim();
  const md5Password = String(body.md5Password || body.md5_password || "").trim();
  const shared = {};
  if (password) shared.password = password;
  if (md5Password) shared.md5_password = md5Password;
  if (mode === "email") {
    return compactParams({
      email: String(body.email || "").trim(),
      ...shared
    });
  }
  return compactParams({
    phone: String(body.phone || "").trim(),
    ...shared,
    captcha: String(body.captcha || "").trim(),
    countrycode: String(body.countrycode || body.countryCode || "86").trim()
  });
}

function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

function hasPasswordLoginCredential(params = {}, mode = "cellphone") {
  const accountReady = mode === "email" ? Boolean(params.email) : Boolean(params.phone);
  return accountReady && Boolean(params.password || params.md5_password || params.captcha);
}

function isPasswordLoginAccepted(data = {}) {
  const code = Number(data.code || data.body?.code || data.data?.code || 200);
  return [200, 803].includes(code);
}
