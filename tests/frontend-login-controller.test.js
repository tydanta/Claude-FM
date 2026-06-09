import assert from "node:assert/strict";
import { createLoginController } from "../public/modules/netease/loginController.js";

function createElement() {
  return {
    attributes: {},
    dataset: {},
    hidden: false,
    textContent: "",
    src: "",
    disabled: false,
    value: "",
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function createHarness({ startResponse, checks = [], passwordResponse, rejectCheck = false, rejectPassword = false } = {}) {
  const calls = {
    start: 0,
    check: [],
    password: [],
    clear: [],
    intervals: [],
    load: [],
    profile: [],
    refresh: 0
  };
  let nextTimerId = 1;
  const elements = {
    neteaseLoginBtn: createElement(),
    neteaseLoginStatus: createElement(),
    neteaseLoginMethodsPanel: createElement(),
    neteaseQrImage: createElement(),
    neteaseQrPanel: createElement(),
    neteasePasswordLoginForm: createElement(),
    neteasePasswordSubmitBtn: createElement(),
    neteasePasswordLoginInputs: {
      mode: createElement(),
      phone: createElement(),
      email: createElement(),
      password: createElement(),
      captcha: createElement(),
      countrycode: createElement()
    }
  };
  const controller = createLoginController({
    elements,
    neteaseApi: {
      async startQrLogin() {
        calls.start += 1;
        return startResponse || { key: "qr-key", qrimg: "qr-image" };
      },
      async checkQrLogin(payload) {
        calls.check.push(payload);
        if (rejectCheck) throw new Error("offline");
        return checks.shift() || { code: 801 };
      },
      async submitPasswordLogin(payload) {
        calls.password.push(payload);
        if (rejectPassword) throw new Error("bad password");
        return passwordResponse || { ok: true, loggedIn: true, cookieReady: true, profile: { userId: 8, nickname: "Remote" } };
      }
    },
    loadNeteasePlaylists: async (options) => calls.load.push(options),
    refreshNeteaseStatus: async () => calls.refresh += 1,
    setNeteaseProfile: (profile) => calls.profile.push(profile),
    setIntervalFn: (fn, ms) => {
      const id = nextTimerId;
      nextTimerId += 1;
      calls.intervals.push({ id, fn, ms });
      return id;
    },
    clearIntervalFn: (id) => calls.clear.push(id)
  });
  return { calls, controller, elements };
}

{
  const { calls, controller, elements } = createHarness();
  elements.neteaseLoginBtn.dataset.neteaseLoggedIn = "true";

  await controller.handleLoginButtonClick();

  assert.deepEqual(calls.load[0], { refresh: true });
  assert.equal(calls.start, 0);
}

{
  const { calls, controller, elements } = createHarness();
  elements.neteaseLoginBtn.dataset.neteaseLoggedIn = "false";
  elements.neteaseLoginMethodsPanel.hidden = true;
  elements.neteasePasswordLoginInputs.mode.value = "qr";

  await controller.handleLoginButtonClick();

  assert.equal(elements.neteaseLoginMethodsPanel.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.mode.value, "qr");
  assert.equal(calls.start, 1);
  assert.equal(elements.neteaseQrPanel.hidden, false);

  await controller.handleLoginButtonClick();

  assert.equal(elements.neteaseLoginMethodsPanel.hidden, true);
  assert.equal(elements.neteaseQrPanel.hidden, true);
  assert.deepEqual(calls.clear, [null, 1]);
}

{
  const { calls, controller, elements } = createHarness();
  elements.neteaseLoginMethodsPanel.hidden = false;
  elements.neteasePasswordLoginInputs.mode.value = "qr";

  await controller.handleLoginModeChange();

  assert.equal(calls.start, 1);
  assert.equal(elements.neteaseQrPanel.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.phone.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.email.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.password.hidden, true);
  assert.equal(elements.neteasePasswordSubmitBtn.hidden, true);

  elements.neteasePasswordLoginInputs.mode.value = "email";
  await controller.handleLoginModeChange();

  assert.equal(elements.neteaseQrPanel.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.phone.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.email.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.password.hidden, false);
  assert.equal(elements.neteasePasswordSubmitBtn.hidden, false);
}

{
  const { calls, controller, elements } = createHarness({
    startResponse: { key: "qr-key", qrimg: "qr-image" },
    checks: [{ code: 801 }, { code: 802 }]
  });

  await controller.startNeteaseQrLogin();
  assert.equal(elements.neteaseQrImage.src, "qr-image");
  assert.equal(elements.neteaseQrPanel.hidden, false);
  assert.equal(elements.neteaseLoginStatus.textContent, "请用网易云音乐扫码并确认登录。");
  assert.equal(calls.intervals[0].ms, 2200);

  await calls.intervals[0].fn();
  assert.equal(elements.neteaseLoginStatus.textContent, "等待扫码...");

  await calls.intervals[0].fn();
  assert.equal(elements.neteaseLoginStatus.textContent, "已扫码，等待确认...");
}

{
  const profile = { userId: 8, nickname: "Remote" };
  const { calls, controller, elements } = createHarness({
    checks: [{ code: 803, loggedIn: true, cookieReady: true, profile }]
  });

  await controller.startNeteaseQrLogin();
  await calls.intervals[0].fn();

  assert.deepEqual(calls.clear, [null, 1, null]);
  assert.equal(elements.neteaseQrPanel.hidden, true);
  assert.equal(elements.neteaseLoginStatus.textContent, "登录成功，正在同步歌单...");
  assert.deepEqual(calls.profile[0], profile);
  assert.equal(calls.refresh, 1);
}

{
  let resolveCheck;
  const { calls, controller } = createHarness({
    checks: [new Promise((resolve) => { resolveCheck = resolve; }), { code: 802 }]
  });

  await controller.startNeteaseQrLogin();
  const firstCheck = calls.intervals[0].fn();
  await calls.intervals[0].fn();
  assert.equal(calls.check.length, 1);

  resolveCheck({ code: 801 });
  await firstCheck;
  await calls.intervals[0].fn();
  assert.equal(calls.check.length, 2);
}

{
  const { calls, controller, elements } = createHarness({
    checks: [{ code: 803, loggedIn: false, cookieReady: false }]
  });

  await controller.startNeteaseQrLogin();
  await calls.intervals[0].fn();

  assert.deepEqual(calls.clear, [null, 1]);
  assert.equal(elements.neteaseQrPanel.hidden, false);
  assert.equal(elements.neteaseLoginStatus.textContent, "扫码已确认，但登录凭据没有保存成功，请重新扫码。");
}

{
  const { calls, controller, elements } = createHarness({
    checks: [{ code: 800 }]
  });

  await controller.startNeteaseQrLogin();
  await calls.intervals[0].fn();

  assert.deepEqual(calls.clear, [null, 1]);
  assert.equal(elements.neteaseLoginStatus.textContent, "二维码已过期，请重新登录。");
}

{
  const { calls, controller, elements } = createHarness({ rejectCheck: true });

  await controller.startNeteaseQrLogin();
  await calls.intervals[0].fn();

  assert.deepEqual(calls.clear, [null, 1]);
  assert.equal(elements.neteaseLoginStatus.textContent, "登录状态检查失败，请重新尝试。");
}

{
  const { calls, controller, elements } = createHarness();
  elements.neteasePasswordLoginInputs.mode.value = "cellphone";
  elements.neteasePasswordLoginInputs.phone.value = " 13800000000 ";
  elements.neteasePasswordLoginInputs.password.value = " secret ";
  elements.neteasePasswordLoginInputs.countrycode.value = "86";

  await controller.submitPasswordLogin({ preventDefault() {} });

  assert.deepEqual(calls.password[0], {
    mode: "cellphone",
    phone: "13800000000",
    email: "",
    password: "secret",
    captcha: "",
    countrycode: "86"
  });
  assert.equal(elements.neteaseQrPanel.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.password.value, "");
  assert.deepEqual(calls.profile[0], { userId: 8, nickname: "Remote" });
  assert.equal(calls.refresh, 1);
}

{
  const { calls, controller, elements } = createHarness();
  elements.neteasePasswordLoginInputs.mode.value = "email";
  elements.neteasePasswordLoginInputs.email.value = "name@163.com";
  elements.neteasePasswordLoginInputs.password.value = "secret";

  await controller.submitPasswordLogin({ preventDefault() {} });

  assert.equal(calls.password[0].mode, "email");
  assert.equal(calls.password[0].email, "name@163.com");
  assert.equal(calls.password[0].phone, "");
}

{
  const { controller, elements } = createHarness();
  elements.neteasePasswordLoginInputs.mode.value = "email";
  controller.syncPasswordLoginMode();
  assert.equal(elements.neteasePasswordLoginInputs.phone.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.email.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.captcha.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.countrycode.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.password.hidden, false);
  assert.equal(elements.neteasePasswordSubmitBtn.hidden, false);

  elements.neteasePasswordLoginInputs.mode.value = "cellphone";
  controller.syncPasswordLoginMode();
  assert.equal(elements.neteasePasswordLoginInputs.phone.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.email.hidden, true);
  assert.equal(elements.neteasePasswordLoginInputs.captcha.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.countrycode.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.password.hidden, false);
  assert.equal(elements.neteasePasswordSubmitBtn.hidden, false);
}

{
  const { calls, controller, elements } = createHarness();
  elements.neteasePasswordLoginInputs.mode.value = "cellphone";
  elements.neteasePasswordLoginInputs.phone.value = "";
  elements.neteasePasswordLoginInputs.password.value = "secret";

  await controller.submitPasswordLogin({ preventDefault() {} });

  assert.equal(calls.password.length, 0);
  assert.notEqual(elements.neteaseLoginStatus.textContent, "");
}

{
  const { calls, controller, elements } = createHarness({ rejectPassword: true });
  elements.neteasePasswordLoginInputs.mode.value = "cellphone";
  elements.neteasePasswordLoginInputs.phone.value = "13800000000";
  elements.neteasePasswordLoginInputs.password.value = "bad";

  await controller.submitPasswordLogin({ preventDefault() {} });

  assert.equal(calls.password.length, 1);
  assert.equal(elements.neteasePasswordLoginForm.hidden, false);
  assert.equal(elements.neteasePasswordLoginInputs.password.value, "bad");
  assert.notEqual(elements.neteaseLoginStatus.textContent, "");
}

console.log("frontend-login-controller tests passed");
