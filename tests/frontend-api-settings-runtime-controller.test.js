import assert from "node:assert/strict";
import { createApiSettingsRuntimeController } from "../public/modules/settings/apiSettingsRuntimeController.js";

function createInput({ id, name, value = "", secret = false } = {}) {
  return {
    id,
    name,
    value,
    type: secret ? "password" : "text",
    dataset: {},
    focused: false,
    matches(selector) {
      return secret && selector === "[data-secret-input]";
    },
    closest() {
      return { querySelector: () => ({ textContent: "API KEY" }) };
    },
    focus() {
      this.focused = true;
    }
  };
}

function createButton(toggleId) {
  const listeners = {};
  return {
    dataset: { secretToggle: toggleId },
    disabled: false,
    attributes: {},
    listeners,
    classList: {
      values: new Set(),
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      }
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function createForm() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };
}

function createHarness({ apiSettings, revealedSettings, saveSettings, apiError, localApiSettingsRuntime = false, localStoredSettings = {} } = {}) {
  const calls = {
    api: [],
    synced: 0,
    storage: [],
    insightCleared: 0,
    warmCleared: 0,
    noticesCleared: [],
    capabilities: 0,
    now: 0,
    insights: []
  };
  const openaiKey = createInput({
    id: "deepseekKeyInput",
    name: "openaiKey",
    value: "sk-old",
    secret: true
  });
  const remoteCapabilityBaseUrl = createInput({
    id: "remoteCapabilityBaseUrlInput",
    name: "remoteCapabilityBaseUrl",
    value: " https://old.example.com "
  });
  const button = createButton("deepseekKeyInput");
  const form = createForm();
  const status = { textContent: "" };
  const chatLog = { dataset: { insightTrackId: "track-1" } };
  const voiceCache = {
    cleared: 0,
    clear() {
      this.cleared += 1;
    }
  };
  const documentRef = {
    querySelector(selector) {
      if (selector === "#deepseekKeyInput") return openaiKey;
      if (selector === "[data-secret-toggle=\"deepseekKeyInput\"]") return button;
      return null;
    }
  };
  const controller = createApiSettingsRuntimeController({
    elements: {
      apiSettingsForm: form,
      apiSettingsStatus: status,
      apiSettingsInputs: {
        openaiKey,
        remoteCapabilityBaseUrl
      },
      secretToggles: [button]
    },
    api: async (url, options = {}) => {
      calls.api.push({ url, options });
      if (apiError) throw apiError;
      if (url === "/api/settings?reveal=1") return { settings: revealedSettings || {} };
      if (options.method === "POST") return { settings: saveSettings || JSON.parse(options.body) };
      return { settings: apiSettings || {} };
    },
    readStorage: (key) => {
      if (key === "claudio-api-settings") return JSON.stringify(localStoredSettings);
      return "";
    },
    documentRef,
    syncAllStyledSelects: () => {
      calls.synced += 1;
    },
    writeStorage: (key, value) => calls.storage.push({ key, value }),
    voiceCache,
    clearInsightCache: () => {
      calls.insightCleared += 1;
    },
    clearNeteaseUrlWarmCache: () => {
      calls.warmCleared += 1;
    },
    clearClaudioNotice: (key) => calls.noticesCleared.push(key),
    refreshCapabilities: () => {
      calls.capabilities += 1;
    },
    refreshNow: async () => {
      calls.now += 1;
    },
    getDjModeEnabled: () => true,
    getCurrentTrackId: () => "track-1",
    loadInsightForTrack: (trackId, options) => calls.insights.push({ trackId, options }),
    chatLog,
    isLocalApiSettingsRuntime: () => localApiSettingsRuntime
  });
  return {
    button,
    calls,
    chatLog,
    controller,
    form,
    openaiKey,
    remoteCapabilityBaseUrl,
    status,
    voiceCache
  };
}

{
  const { calls, controller, openaiKey, remoteCapabilityBaseUrl } = createHarness({
    apiSettings: {
      openaiKey: "********abc",
      remoteCapabilityBaseUrl: "https://fm.example.com"
    }
  });

  await controller.loadApiSettings();

  assert.equal(calls.api[0].url, "/api/settings");
  assert.equal(calls.api[0].options.weatherLocationQuery, false);
  assert.equal(openaiKey.value, "********abc");
  assert.equal(openaiKey.dataset.maskedValue, "********abc");
  assert.equal(remoteCapabilityBaseUrl.value, "https://fm.example.com");
  assert.equal(calls.synced, 1);
}

{
  const { button, calls, controller, openaiKey, status } = createHarness({
    apiSettings: { openaiKey: "********abc" },
    revealedSettings: { openaiKey: "sk-real" }
  });

  await controller.loadApiSettings();
  await controller.toggleSecretInput(button);

  assert.equal(calls.api[1].url, "/api/settings?reveal=1");
  assert.equal(openaiKey.value, "sk-real");
  assert.equal(openaiKey.type, "text");
  assert.equal(openaiKey.focused, true);
  assert.equal(button.classList.contains("is-visible"), true);
  assert.equal(button.attributes["aria-label"], "隐藏 API KEY");
  assert.equal(status.textContent, "");

  await controller.toggleSecretInput(button);
  assert.equal(openaiKey.type, "password");
  assert.equal(button.classList.contains("is-visible"), false);
  assert.equal(button.attributes["aria-label"], "显示 API KEY");
}

{
  const { calls, chatLog, controller, form, remoteCapabilityBaseUrl, status, voiceCache } = createHarness({
    apiSettings: { openaiKey: "********abc" },
    saveSettings: {
      openaiKey: "********abc",
      remoteCapabilityBaseUrl: "https://new.example.com"
    }
  });

  await controller.loadApiSettings();
  remoteCapabilityBaseUrl.value = " https://new.example.com ";
  await controller.saveApiSettings({ preventDefault() {} });

  assert.deepEqual(JSON.parse(calls.api[1].options.body), {
    remoteCapabilityBaseUrl: "https://new.example.com"
  });
  assert.equal(status.textContent, "API 设置已保存。");
  assert.deepEqual(calls.storage, [
    { key: "claudio-remote-api", value: "https://new.example.com" }
  ]);
  assert.equal(voiceCache.cleared, 1);
  assert.equal(calls.insightCleared, 1);
  assert.equal(calls.warmCleared, 1);
  assert.deepEqual(calls.noticesCleared, ["chat-error", "insight-error"]);
  assert.equal(chatLog.dataset.insightTrackId, "");
  assert.equal(calls.capabilities, 1);
  assert.equal(calls.now, 1);
  assert.deepEqual(calls.insights, [{ trackId: "track-1", options: { force: true } }]);

  controller.bindApiSettingsEvents();
  assert.equal(typeof form.listeners.submit, "function");
}

{
  const { calls, controller, form, remoteCapabilityBaseUrl, status } = createHarness({
    localApiSettingsRuntime: true,
    localStoredSettings: { openaiKey: "sk-phone" }
  });

  await controller.loadApiSettings();
  remoteCapabilityBaseUrl.value = " http://phone.local:3088 ";
  await controller.saveApiSettings({ preventDefault() {} });

  assert.equal(calls.api[0].url, "/api/settings");
  assert.equal(calls.api[0].options.method, "POST");
  assert.equal(JSON.parse(calls.api[0].options.body).openaiKey, "sk-phone");
  assert.equal(calls.api[1].url, "/api/settings");
  assert.equal(calls.api[1].options.method, "POST");
  assert.ok(!status.textContent.includes("澶辫触"));
  assert.deepEqual(calls.storage, [
    { key: "claudio-api-settings", value: JSON.stringify({ remoteCapabilityBaseUrl: "http://phone.local:3088" }) },
    { key: "claudio-remote-api", value: "http://phone.local:3088" }
  ]);

  controller.bindApiSettingsEvents();
  assert.equal(typeof form.listeners.submit, "function");
}

console.log("frontend-api-settings-runtime-controller tests passed");
