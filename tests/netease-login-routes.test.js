import assert from "node:assert/strict";
import { registerNeteaseLoginRoutes } from "../src/server/routes/netease-login-routes.js";
import { createRouter } from "../src/server/router.js";

const sent = [];
const kvWrites = [];
const cookies = [];
const calls = [];
let storedProfile = { userId: 7, nickname: "Local" };
let localPlaylists = [{ id: "liked" }];
let cookieReady = false;

const router = createRouter();
registerNeteaseLoginRoutes(router, {
  neteaseRequest: async (pathname, params = {}, options = {}) => {
    calls.push({ pathname, params, options });
    if (pathname === "/login/status") return { data: { profile: { userId: 8, nickname: "Remote" } } };
    if (pathname === "/login/qr/key") return { data: { unikey: "qr-key" } };
    if (pathname === "/login/qr/create") return { data: { qrimg: "img", qrurl: "url" } };
    if (pathname === "/login/qr/check" && params.noCookie !== "true") return { code: 803, cookie: "partial-cookie", message: "ok" };
    if (pathname === "/login/qr/check") return { code: 803, cookie: "MUSIC_U=real", message: "ok" };
    return {};
  },
  getStoredNeteaseProfile: () => storedProfile,
  getLocalNeteasePlaylists: () => localPlaylists,
  hasNeteaseLoginCookie: (cookie = "") => cookieReady || String(cookie).includes("MUSIC_U="),
  getNeteaseCookie: () => "",
  setNeteaseCookie: (cookie) => {
    cookies.push(cookie);
    if (String(cookie).includes("MUSIC_U=")) cookieReady = true;
  },
  setKv: (key, value) => kvWrites.push([key, value]),
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => sent.push({ status, payload })
});

await router.handle({
  req: { method: "GET" },
  res: {},
  url: new URL("http://localhost/api/netease/login/status")
});
assert.deepEqual(sent.pop(), {
  status: 200,
  payload: {
    ok: true,
    loggedIn: true,
    offline: false,
    hasLocalData: true,
    profile: { userId: 8, nickname: "Remote" },
    cookieReady: false
  }
});
assert.deepEqual(kvWrites.pop(), ["netease.profile", JSON.stringify({ userId: 8, nickname: "Remote" })]);

const cookieStatusSent = [];
const cookieStatusRouter = createRouter();
registerNeteaseLoginRoutes(cookieStatusRouter, {
  neteaseRequest: async (pathname) => {
    if (pathname === "/login/status") return { data: { profile: null } };
    return {};
  },
  getStoredNeteaseProfile: () => ({ userId: 9, nickname: "Cached" }),
  getLocalNeteasePlaylists: () => [{ id: "cached" }],
  hasNeteaseLoginCookie: () => true,
  getNeteaseCookie: () => "MUSIC_U=stored",
  setNeteaseCookie: () => {},
  setKv: () => {},
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => cookieStatusSent.push({ status, payload })
});
await cookieStatusRouter.handle({
  req: { method: "GET" },
  res: {},
  url: new URL("http://localhost/api/netease/login/status")
});
assert.deepEqual(cookieStatusSent.pop(), {
  status: 200,
  payload: {
    ok: true,
    loggedIn: true,
    offline: false,
    hasLocalData: true,
    profile: { userId: 9, nickname: "Cached" },
    cookieReady: true
  }
});

await router.handle({
  req: { method: "POST" },
  res: {},
  url: new URL("http://localhost/api/netease/login/qr/start")
});
assert.deepEqual(sent.pop(), {
  status: 200,
  payload: { ok: true, key: "qr-key", qrimg: "img", qrurl: "url" }
});

await router.handle({
  req: { method: "POST", body: { key: "qr-key" } },
  res: {},
  url: new URL("http://localhost/api/netease/login/qr/check")
});
assert.deepEqual(sent.pop(), {
  status: 200,
  payload: {
    ok: true,
    code: 803,
    message: "ok",
    cookieReady: true,
    loggedIn: true,
    profile: { userId: 8, nickname: "Remote" }
  }
});
assert.deepEqual(cookies, ["MUSIC_U=real"]);
assert.deepEqual(
  calls.filter((call) => call.pathname === "/login/qr/check").map((call) => call.params.noCookie),
  ["", "true"]
);
assert.deepEqual(
  calls.filter((call) => call.pathname === "/login/qr/check").map((call) => call.options.method),
  ["GET", "GET"]
);

await router.handle({
  req: {
    method: "POST",
    body: {
      mode: "cellphone",
      phone: "13800000000",
      password: "secret-password",
      countrycode: "86"
    }
  },
  res: {},
  url: new URL("http://localhost/api/netease/login/password")
});
assert.deepEqual(sent.pop(), {
  status: 200,
  payload: {
    ok: true,
    loggedIn: true,
    cookieReady: true,
    profile: { userId: 8, nickname: "Remote" }
  }
});
const cellphoneCall = calls.find((call) => call.pathname === "/login/cellphone");
assert.deepEqual(cellphoneCall.params, {
  phone: "13800000000",
  password: "secret-password",
  countrycode: "86"
});
assert.equal(cellphoneCall.options.method, "POST");

await router.handle({
  req: {
    method: "POST",
    body: {
      mode: "email",
      email: "name@163.com",
      md5Password: "0123456789abcdef0123456789abcdef"
    }
  },
  res: {},
  url: new URL("http://localhost/api/netease/login/password")
});
const emailCall = calls.find((call) => call.pathname === "/login");
assert.deepEqual(emailCall.params, {
  email: "name@163.com",
  md5_password: "0123456789abcdef0123456789abcdef"
});
assert.equal(emailCall.options.method, "POST");

const offlineSent = [];
const offlineRouter = createRouter();
registerNeteaseLoginRoutes(offlineRouter, {
  neteaseRequest: async () => {
    throw new Error("offline");
  },
  getStoredNeteaseProfile: () => ({ userId: 9, nickname: "Cached" }),
  getLocalNeteasePlaylists: () => [],
  hasNeteaseLoginCookie: () => false,
  getNeteaseCookie: () => "",
  setNeteaseCookie: () => {},
  setKv: () => {},
  parseBody: async () => ({}),
  sendJson: (res, status, payload) => offlineSent.push({ status, payload })
});
await offlineRouter.handle({
  req: { method: "GET" },
  res: {},
  url: new URL("http://localhost/api/netease/login/status")
});
assert.deepEqual(offlineSent, [{
  status: 200,
  payload: {
    ok: true,
    loggedIn: false,
    offline: true,
    hasLocalData: false,
    profile: { userId: 9, nickname: "Cached" },
    cookieReady: false
  }
}]);

const failedSent = [];
const failedRouter = createRouter();
registerNeteaseLoginRoutes(failedRouter, {
  neteaseRequest: async (pathname) => {
    if (pathname === "/login/cellphone") return { code: 502, message: "bad password", cookie: "MUSIC_U=leak" };
    return {};
  },
  getStoredNeteaseProfile: () => null,
  getLocalNeteasePlaylists: () => [],
  hasNeteaseLoginCookie: () => false,
  getNeteaseCookie: () => "",
  setNeteaseCookie: () => {
    throw new Error("must not persist failed login cookie");
  },
  setKv: () => {},
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => failedSent.push({ status, payload })
});
await failedRouter.handle({
  req: { method: "POST", body: { mode: "cellphone", phone: "13800000000", password: "bad" } },
  res: {},
  url: new URL("http://localhost/api/netease/login/password")
});
assert.equal(failedSent[0].status, 401);
assert.equal(failedSent[0].payload.ok, false);
assert.equal(failedSent[0].payload.reason, "password-login-failed");
assert.equal(JSON.stringify(failedSent[0].payload).includes("bad"), false);
assert.equal(JSON.stringify(failedSent[0].payload).includes("MUSIC_U"), false);

const qrRetrySent = [];
const qrRetryCalls = [];
let qrRetryCookieReady = false;
const qrRetryRouter = createRouter();
registerNeteaseLoginRoutes(qrRetryRouter, {
  neteaseRequest: async (pathname, params = {}, options = {}) => {
    qrRetryCalls.push({ pathname, params, options });
    if (pathname === "/login/qr/check" && params.noCookie !== "true") {
      const error = new Error("Netease /login/qr/check failed: 200 502");
      error.status = 502;
      throw error;
    }
    if (pathname === "/login/qr/check") return { code: 803, cookie: "MUSIC_U=qr-real", message: "ok" };
    if (pathname === "/login/status") return { data: { profile: { userId: 10, nickname: "QR" } } };
    return {};
  },
  getStoredNeteaseProfile: () => null,
  getLocalNeteasePlaylists: () => [],
  hasNeteaseLoginCookie: (cookie = "") => qrRetryCookieReady || String(cookie).includes("MUSIC_U="),
  getNeteaseCookie: () => "",
  setNeteaseCookie: (cookie) => {
    if (String(cookie).includes("MUSIC_U=")) qrRetryCookieReady = true;
  },
  setKv: (key, value) => kvWrites.push([key, value]),
  parseBody: async (req) => req.body,
  sendJson: (res, status, payload) => qrRetrySent.push({ status, payload })
});
await qrRetryRouter.handle({
  req: { method: "POST", body: { key: "qr-key" } },
  res: {},
  url: new URL("http://localhost/api/netease/login/qr/check")
});
assert.deepEqual(qrRetrySent.pop(), {
  status: 200,
  payload: {
    ok: true,
    code: 803,
    message: "ok",
    cookieReady: true,
    loggedIn: true,
    profile: { userId: 10, nickname: "QR" }
  }
});
assert.deepEqual(
  qrRetryCalls.filter((call) => call.pathname === "/login/qr/check").map((call) => call.params.noCookie),
  ["", "true"]
);
assert.deepEqual(
  qrRetryCalls.filter((call) => call.pathname === "/login/qr/check").map((call) => call.options.method),
  ["GET", "GET"]
);

console.log("netease-login-routes tests passed");
