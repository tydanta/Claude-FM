import {
  applyApiSettingsToForm,
  buildApiSettingsPayload
} from "./settingsController.js";
import { isLocalAppRuntime } from "../runtime/platform.js";

export function createApiSettingsRuntimeController({
  elements = {},
  api = async () => ({}),
  documentRef = document,
  syncAllStyledSelects = () => {},
  readStorage = (key) => globalThis.window?.localStorage?.getItem(key) || "",
  writeStorage = () => {},
  voiceCache = null,
  clearInsightCache = () => {},
  clearNeteaseUrlWarmCache = () => {},
  clearClaudioNotice = () => {},
  refreshCapabilities = () => {},
  refreshNow = async () => {},
  getDjModeEnabled = () => false,
  getCurrentTrackId = () => "",
  loadInsightForTrack = () => {},
  chatLog = null,
  isLocalApiSettingsRuntime = isLocalAppRuntime
} = {}) {
  const {
    apiSettingsForm,
    apiSettingsStatus,
    apiSettingsInputs = {},
    secretToggles = []
  } = elements;

  function setStatus(message) {
    if (apiSettingsStatus) apiSettingsStatus.textContent = message;
  }

  function applyApiSettings(settings = {}) {
    applyApiSettingsToForm({
      settings,
      inputs: apiSettingsInputs,
      documentRef,
      syncAllStyledSelects
    });
  }

  function readLocalApiSettings() {
    try {
      return JSON.parse(readStorage("claudio-api-settings") || "{}");
    } catch {
      return {};
    }
  }

  async function syncLocalApiSettings(settings = {}) {
    if (!isLocalApiSettingsRuntime() || !settings || !Object.keys(settings).length) return;
    await api("/api/settings", {
      method: "POST",
      weatherLocationQuery: false,
      body: JSON.stringify(settings)
    }).catch(() => {});
  }

  async function revealApiSecrets() {
    if (isLocalApiSettingsRuntime()) {
      return readLocalApiSettings();
    }
    const data = await api("/api/settings?reveal=1", { weatherLocationQuery: false });
    return data.settings || {};
  }

  async function toggleSecretInput(button) {
    const input = documentRef.querySelector(`#${button.dataset.secretToggle}`);
    if (!input) return;
    const show = input.type === "password";
    if (show) {
      if ((input.value || "") === (input.dataset.maskedValue || "") || /\*{2,}/.test(input.value || "")) {
        button.disabled = true;
        const settings = await revealApiSecrets().catch(() => null);
        button.disabled = false;
        if (!settings) {
          setStatus("API KEY 明文读取失败。");
          return;
        }
        const key = input.name;
        input.value = settings[key] || input.value;
        if (/\*{2,}/.test(input.value || "")) {
          setStatus("当前保存的 API KEY 已经是脱敏值，无法还原明文；请重新粘贴完整密钥后保存。");
        }
      }
      input.type = "text";
      button.classList.add("is-visible");
      button.setAttribute("aria-label", "隐藏 API KEY");
      input.focus();
      return;
    }
    input.type = "password";
    button.classList.remove("is-visible");
    button.setAttribute("aria-label", "显示 API KEY");
  }

  async function loadApiSettings() {
    if (!apiSettingsForm) return;
    if (isLocalApiSettingsRuntime()) {
      const settings = readLocalApiSettings();
      applyApiSettings(settings);
      syncLocalApiSettings(settings);
      return;
    }
    try {
      const data = await api("/api/settings", { weatherLocationQuery: false });
      applyApiSettings(data.settings || {});
    } catch {
      setStatus("API 设置暂时读取失败。");
    }
  }

  async function saveApiSettings(event) {
    event.preventDefault();
    if (!apiSettingsForm) return;
    const body = buildApiSettingsPayload(apiSettingsInputs);
    if (isLocalApiSettingsRuntime()) {
      applyApiSettings(body);
      writeStorage("claudio-api-settings", JSON.stringify(body));
      writeStorage("claudio-remote-api", body.remoteCapabilityBaseUrl || "");
      await syncLocalApiSettings(body);
      setStatus("API \u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002");
      voiceCache?.clear?.();
      clearInsightCache();
      clearNeteaseUrlWarmCache();
      clearClaudioNotice("chat-error");
      clearClaudioNotice("insight-error");
      if (chatLog) chatLog.dataset.insightTrackId = "";
      refreshCapabilities();
      await refreshNow();
      const currentTrackId = getCurrentTrackId();
      if (getDjModeEnabled() && currentTrackId) {
        loadInsightForTrack(currentTrackId, { force: true });
      }
      return;
    }
    setStatus("正在保存 API 设置...");
    try {
      const data = await api("/api/settings", {
        method: "POST",
        weatherLocationQuery: false,
        body: JSON.stringify(body)
      });
      applyApiSettings(data.settings || {});
      writeStorage("claudio-remote-api", data.settings?.remoteCapabilityBaseUrl || "");
      setStatus("API 设置已保存。");
      voiceCache?.clear?.();
      clearInsightCache();
      clearNeteaseUrlWarmCache();
      clearClaudioNotice("chat-error");
      clearClaudioNotice("insight-error");
      if (chatLog) chatLog.dataset.insightTrackId = "";
      refreshCapabilities();
      await refreshNow();
      const currentTrackId = getCurrentTrackId();
      if (getDjModeEnabled() && currentTrackId) {
        loadInsightForTrack(currentTrackId, { force: true });
      }
    } catch {
      setStatus("API 设置保存失败，请稍后重试。");
    }
  }

  function bindApiSettingsEvents() {
    apiSettingsForm?.addEventListener("submit", saveApiSettings);
    secretToggles.forEach((button) => {
      button.addEventListener("click", () => toggleSecretInput(button));
    });
  }

  return {
    applyApiSettings,
    bindApiSettingsEvents,
    loadApiSettings,
    revealApiSecrets,
    saveApiSettings,
    toggleSecretInput
  };
}
