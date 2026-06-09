function normalizeLoginElements(elements = {}) {
  return {
    neteaseLoginBtn: elements.neteaseLoginBtn,
    neteaseLoginStatus: elements.neteaseLoginStatus,
    neteaseLoginMethodsPanel: elements.neteaseLoginMethodsPanel,
    neteaseQrImage: elements.neteaseQrImage,
    neteaseQrPanel: elements.neteaseQrPanel,
    neteasePasswordLoginForm: elements.neteasePasswordLoginForm,
    neteasePasswordSubmitBtn: elements.neteasePasswordSubmitBtn,
    neteasePasswordLoginInputs: elements.neteasePasswordLoginInputs || {}
  };
}

export function createLoginController({
  elements = {},
  neteaseApi,
  loadNeteasePlaylists = async () => {},
  refreshNeteaseStatus = async () => {},
  setNeteaseProfile = () => {},
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
} = {}) {
  const {
    neteaseLoginBtn,
    neteaseLoginStatus,
    neteaseLoginMethodsPanel,
    neteaseQrImage,
    neteaseQrPanel,
    neteasePasswordLoginForm,
    neteasePasswordSubmitBtn,
    neteasePasswordLoginInputs
  } = normalizeLoginElements(elements);

  let qrLoginTimer = null;
  let qrLoginCheckInFlight = false;

  function stopNeteaseQrLogin() {
    clearIntervalFn(qrLoginTimer);
    qrLoginTimer = null;
    qrLoginCheckInFlight = false;
  }

  function isLoggedInButtonState() {
    return neteaseLoginBtn?.dataset?.neteaseLoggedIn === "true";
  }

  function setLoginMethodsVisible(visible) {
    if (neteaseLoginMethodsPanel) neteaseLoginMethodsPanel.hidden = !visible;
    neteaseLoginBtn?.setAttribute?.("aria-expanded", String(Boolean(visible)));
    if (!visible) {
      stopNeteaseQrLogin();
      if (neteaseQrPanel) neteaseQrPanel.hidden = true;
    }
  }

  async function handleQrLoginCheck(key) {
    if (qrLoginCheckInFlight) return;
    qrLoginCheckInFlight = true;
    try {
      const check = await neteaseApi.checkQrLogin({ key });
      if (check.code === 801 && neteaseLoginStatus) neteaseLoginStatus.textContent = "等待扫码...";
      if (check.code === 802 && neteaseLoginStatus) neteaseLoginStatus.textContent = "已扫码，等待确认...";
      if (check.code === 803) {
        stopNeteaseQrLogin();
        if (check.loggedIn || check.cookieReady) {
          setLoginMethodsVisible(false);
          if (neteaseLoginStatus) neteaseLoginStatus.textContent = "登录成功，正在同步歌单...";
          if (check.profile) setNeteaseProfile(check.profile);
          await refreshNeteaseStatus();
        } else if (neteaseLoginStatus) {
          neteaseLoginStatus.textContent = "扫码已确认，但登录凭据没有保存成功，请重新扫码。";
        }
      }
      if (check.code === 800) {
        stopNeteaseQrLogin();
        if (neteaseLoginStatus) neteaseLoginStatus.textContent = "二维码已过期，请重新登录。";
      }
    } catch {
      stopNeteaseQrLogin();
      if (neteaseLoginStatus) neteaseLoginStatus.textContent = "登录状态检查失败，请重新尝试。";
    } finally {
      qrLoginCheckInFlight = false;
    }
  }

  async function startNeteaseQrLogin() {
    const data = await neteaseApi.startQrLogin();
    if (neteaseQrImage) neteaseQrImage.src = data.qrimg || "";
    if (neteaseQrPanel) neteaseQrPanel.hidden = false;
    if (neteaseLoginStatus) neteaseLoginStatus.textContent = "请用网易云音乐扫码并确认登录。";
    stopNeteaseQrLogin();
    qrLoginTimer = setIntervalFn(() => handleQrLoginCheck(data.key), 2200);
  }

  function buildPasswordLoginPayload() {
    const mode = neteasePasswordLoginInputs.mode?.value === "email" ? "email" : "cellphone";
    return {
      mode,
      phone: String(neteasePasswordLoginInputs.phone?.value || "").trim(),
      email: String(neteasePasswordLoginInputs.email?.value || "").trim(),
      password: String(neteasePasswordLoginInputs.password?.value || "").trim(),
      captcha: String(neteasePasswordLoginInputs.captcha?.value || "").trim(),
      countrycode: String(neteasePasswordLoginInputs.countrycode?.value || "86").trim() || "86"
    };
  }

  function hasPasswordLoginFields(payload = {}) {
    const account = payload.mode === "email" ? payload.email : payload.phone;
    return Boolean(account && (payload.password || payload.captcha));
  }

  function syncPasswordLoginMode() {
    const mode = neteasePasswordLoginInputs.mode?.value || "qr";
    const isQr = mode === "qr";
    const isEmail = mode === "email";
    if (neteaseQrPanel) neteaseQrPanel.hidden = !isQr;
    if (neteasePasswordLoginInputs.phone) neteasePasswordLoginInputs.phone.hidden = isQr || isEmail;
    if (neteasePasswordLoginInputs.email) neteasePasswordLoginInputs.email.hidden = isQr || !isEmail;
    if (neteasePasswordLoginInputs.password) neteasePasswordLoginInputs.password.hidden = isQr;
    if (neteasePasswordLoginInputs.captcha) neteasePasswordLoginInputs.captcha.hidden = isQr || isEmail;
    if (neteasePasswordLoginInputs.countrycode) neteasePasswordLoginInputs.countrycode.hidden = isQr || isEmail;
    if (neteasePasswordSubmitBtn) neteasePasswordSubmitBtn.hidden = isQr;
  }

  async function handleLoginModeChange() {
    syncPasswordLoginMode();
    if (neteasePasswordLoginInputs.mode?.value === "qr" && !neteaseLoginMethodsPanel?.hidden) {
      await startNeteaseQrLogin();
      return;
    }
    stopNeteaseQrLogin();
    if (neteaseQrPanel) neteaseQrPanel.hidden = true;
  }

  async function handleLoginButtonClick() {
    if (isLoggedInButtonState()) {
      await loadNeteasePlaylists({ refresh: true });
      return;
    }
    const nextVisible = Boolean(neteaseLoginMethodsPanel?.hidden);
    setLoginMethodsVisible(nextVisible);
    if (!nextVisible) return;
    if (neteasePasswordLoginInputs.mode && !neteasePasswordLoginInputs.mode.value) {
      neteasePasswordLoginInputs.mode.value = "qr";
    }
    await handleLoginModeChange();
  }

  async function submitPasswordLogin(event) {
    event?.preventDefault?.();
    syncPasswordLoginMode();
    const payload = buildPasswordLoginPayload();
    if (!hasPasswordLoginFields(payload)) {
      if (neteaseLoginStatus) {
        neteaseLoginStatus.textContent = payload.mode === "email"
          ? "请输入邮箱账号和密码。"
          : "请输入手机号和密码。";
      }
      return;
    }
    if (neteaseLoginStatus) neteaseLoginStatus.textContent = "正在登录网易云...";
    if (neteaseLoginBtn) neteaseLoginBtn.disabled = true;
    stopNeteaseQrLogin();
    try {
      const result = await neteaseApi.submitPasswordLogin(payload);
      if (!result.loggedIn && !result.cookieReady) throw new Error("password-login-failed");
      setLoginMethodsVisible(false);
      if (neteaseLoginStatus) neteaseLoginStatus.textContent = "登录成功，正在同步歌单...";
      if (neteasePasswordLoginInputs.password) neteasePasswordLoginInputs.password.value = "";
      if (result.profile) setNeteaseProfile(result.profile);
      await refreshNeteaseStatus();
    } catch {
      if (neteaseLoginStatus) neteaseLoginStatus.textContent = "网易云账号登录失败，请检查账号、密码或验证码。";
      if (neteasePasswordLoginForm) neteasePasswordLoginForm.hidden = false;
    } finally {
      if (neteaseLoginBtn) neteaseLoginBtn.disabled = false;
    }
  }

  return {
    getQrLoginTimer: () => qrLoginTimer,
    handleLoginButtonClick,
    handleLoginModeChange,
    setLoginMethodsVisible,
    startNeteaseQrLogin,
    stopNeteaseQrLogin,
    syncPasswordLoginMode,
    submitPasswordLogin
  };
}
