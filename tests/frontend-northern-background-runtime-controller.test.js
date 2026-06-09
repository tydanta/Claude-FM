import assert from "node:assert/strict";
import { createNorthernBackgroundRuntimeController } from "../public/modules/settings/northernBackgroundRuntimeController.js";

function createOption(value, checked = false) {
  const listeners = {};
  return {
    value,
    checked,
    listeners,
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };
}

function createHarness({
  storage = {},
  apiBackground,
  uploadBackground,
  apiError = null,
  readFileResult = "data:image/png;base64,abc",
  isLocalBackgroundRuntime = () => false
} = {}) {
  const values = new Map(Object.entries(storage));
  const calls = {
    api: [],
    applied: [],
    theme: [],
    written: []
  };
  const options = [
    createOption("dark", true),
    createOption("light"),
    createOption("custom")
  ];
  const input = {
    files: [],
    value: "C:\\fake\\bg.png",
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
  const status = { textContent: "" };
  const body = {
    dataset: {},
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      },
      removeProperty(name) {
        delete this.values[name];
      }
    }
  };
  const preview = { style: { backgroundImage: "" } };
  const controller = createNorthernBackgroundRuntimeController({
    elements: {
      northernBackgroundOptions: options,
      northernBackgroundInput: input,
      northernBackgroundStatus: status,
      northernImagePreview: preview
    },
    api: async (url, optionsArg = {}) => {
      calls.api.push({ url, options: optionsArg });
      if (apiError) throw apiError;
      if (url === "/api/background/upload") return { background: uploadBackground || { mode: "custom", imageUrl: "/uploads/bg.png" } };
      if (optionsArg.method === "POST") return { background: apiBackground || JSON.parse(optionsArg.body) };
      return { background: apiBackground || { mode: "dark", imageUrl: "" } };
    },
    body,
    readStorage: (key) => values.get(key) || "",
    writeStorage: (key, value) => {
      values.set(key, String(value));
      calls.written.push({ key, value: String(value) });
    },
    setTheme: (theme) => calls.theme.push(theme),
    readFileAsDataUrl: async () => readFileResult,
    isLocalBackgroundRuntime,
    applyNorthernBackgroundToDom: (payload) => {
      calls.applied.push(payload.settings);
      payload.setTheme(payload.settings.mode === "light" ? "light" : "dark");
      payload.writeStorage("claudio-northern-mode", payload.settings.mode);
      payload.writeStorage("claudio-northern-image", payload.settings.mode === "custom" ? payload.settings.imageUrl || "" : "");
    }
  });
  return { body, calls, controller, input, options, status, values, preview };
}

{
  const { calls, controller } = createHarness({
    storage: {
      "claudio-northern-mode": "custom",
      "claudio-northern-image": "cached-url"
    },
    apiBackground: { mode: "light", imageUrl: "" }
  });

  await controller.loadNorthernBackground();

  assert.deepEqual(calls.applied, [
    { mode: "custom", imageUrl: "cached-url" },
    { mode: "light", imageUrl: "" }
  ]);
  assert.equal(calls.api[0].url, "/api/background");
  assert.equal(calls.api[0].options.weatherLocationQuery, false);
}

{
  const { calls, controller, status } = createHarness({
    storage: {
      "claudio-northern-mode": "dark"
    }
  });

  await controller.saveNorthernBackground("custom");

  assert.equal(status.textContent, "请先上传一张背景图，再切换到自定义。");
  assert.deepEqual(calls.api, []);
  assert.deepEqual(calls.applied.at(-1), { mode: "dark", imageUrl: "" });
}

{
  const { calls, controller, status } = createHarness({
    storage: {
      "claudio-northern-image": "cached-url"
    },
    apiBackground: { mode: "custom", imageUrl: "server-url" }
  });

  await controller.saveNorthernBackground("custom");

  assert.deepEqual(calls.applied[0], { mode: "custom", imageUrl: "cached-url" });
  assert.equal(calls.api[0].url, "/api/background");
  assert.equal(calls.api[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls.api[0].options.body), { mode: "custom" });
  assert.deepEqual(calls.applied[1], { mode: "custom", imageUrl: "server-url" });
  assert.equal(status.textContent, "背景设置已保存。");
}

{
  const { calls, controller, input, status } = createHarness({
    uploadBackground: { mode: "custom", imageUrl: "uploaded-url" },
    readFileResult: "data:image/png;base64,xyz"
  });

  await controller.uploadNorthernBackground({ type: "image/png", size: 1024 });

  assert.equal(calls.api[0].url, "/api/background/upload");
  assert.equal(calls.api[0].options.method, "POST");
  assert.deepEqual(JSON.parse(calls.api[0].options.body), { image: "data:image/png;base64,xyz" });
  assert.deepEqual(calls.applied[0], { mode: "custom", imageUrl: "uploaded-url" });
  assert.equal(status.textContent, "背景图已保存并应用。");
  assert.equal(input.value, "");
}

{
  const { calls, controller, input, status, values } = createHarness({
    apiError: new Error("missing backend"),
    readFileResult: "data:image/png;base64,local",
    isLocalBackgroundRuntime: () => true
  });

  await controller.uploadNorthernBackground({ type: "image/png", size: 1024 });

  assert.deepEqual(calls.api, []);
  assert.deepEqual(calls.applied[0], { mode: "custom", imageUrl: "data:image/png;base64,local" });
  assert.equal(values.get("claudio-northern-mode"), "custom");
  assert.equal(values.get("claudio-northern-image"), "data:image/png;base64,local");
  assert.notEqual(status.textContent, "");
  assert.equal(input.value, "");
}

{
  const { calls, controller, status, values } = createHarness({
    storage: {
      "claudio-northern-mode": "custom",
      "claudio-northern-image": "data:image/png;base64,cached"
    },
    apiError: new Error("desktop backend missing"),
    isLocalBackgroundRuntime: () => true
  });

  await controller.loadNorthernBackground();
  await controller.saveNorthernBackground("light");

  assert.deepEqual(calls.api, []);
  assert.equal(values.get("claudio-northern-mode"), "light");
  assert.equal(values.get("claudio-northern-image"), "");
  assert.ok(!status.textContent.includes("澶辫触"));
}

{
  const { calls, controller, status } = createHarness();

  await controller.uploadNorthernBackground({ type: "text/plain", size: 1024 });
  assert.equal(status.textContent, "请选择 PNG、JPG、WebP 或 GIF 图片。");
  assert.deepEqual(calls.api, []);

  await controller.uploadNorthernBackground({ type: "image/jpeg", size: 9 * 1024 * 1024 });
  assert.equal(status.textContent, "图片不能超过 8MB。");
  assert.deepEqual(calls.api, []);
}

{
  const { controller, input, options } = createHarness({
    storage: {
      "claudio-northern-image": "cached-url"
    }
  });

  controller.bindNorthernBackgroundEvents();

  assert.equal(typeof options[0].listeners.change, "function");
  assert.equal(typeof input.listeners.change, "function");
}

console.log("frontend-northern-background-runtime-controller tests passed");
