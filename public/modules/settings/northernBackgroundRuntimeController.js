import {
  applyNorthernBackgroundToDom,
  getNorthernBackgroundPayload,
  readFileAsDataUrl,
  validateNorthernBackgroundFile
} from "./backgroundSettings.js";
import { isLocalAppRuntime } from "../runtime/platform.js";

function defaultIsLocalBackgroundRuntime() {
  return isLocalAppRuntime();
}

export function createNorthernBackgroundRuntimeController({
  elements = {},
  api = async () => ({}),
  body = document.body,
  readStorage = () => "",
  writeStorage = () => {},
  setTheme = () => {},
  applyNorthernBackgroundToDom: applyToDom = applyNorthernBackgroundToDom,
  getNorthernBackgroundPayload: getPayload = getNorthernBackgroundPayload,
  readFileAsDataUrl: readFile = readFileAsDataUrl,
  validateNorthernBackgroundFile: validateFile = validateNorthernBackgroundFile,
  isLocalBackgroundRuntime = defaultIsLocalBackgroundRuntime
} = {}) {
  const {
    northernBackgroundOptions = [],
    northernBackgroundInput,
    northernBackgroundStatus,
    northernImagePreview
  } = elements;

  function setStatus(message) {
    if (northernBackgroundStatus) northernBackgroundStatus.textContent = message;
  }

  function getCachedBackground() {
    return {
      mode: readStorage("claudio-northern-mode") || "dark",
      imageUrl: readStorage("claudio-northern-image")
    };
  }

  function applyNorthernBackground(settings = {}) {
    applyToDom({
      settings,
      body,
      options: northernBackgroundOptions,
      preview: northernImagePreview,
      setTheme,
      writeStorage
    });
  }

  async function loadNorthernBackground() {
    applyNorthernBackground(getCachedBackground());
    if (isLocalBackgroundRuntime()) return;
    try {
      const data = await api("/api/background", { weatherLocationQuery: false });
      applyNorthernBackground(data.background || {});
    } catch {
      setStatus("背景设置暂时读取失败，已使用本地缓存。");
    }
  }

  async function saveNorthernBackground(mode) {
    if (mode === "custom" && !readStorage("claudio-northern-image")) {
      setStatus("请先上传一张背景图，再切换到自定义。");
      applyNorthernBackground(getCachedBackground());
      return;
    }
    applyNorthernBackground(getPayload(mode, readStorage("claudio-northern-image")));
    if (isLocalBackgroundRuntime()) {
      setStatus("\u80cc\u666f\u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002");
      return;
    }
    setStatus("正在保存背景设置...");
    try {
      const data = await api("/api/background", {
        method: "POST",
        body: JSON.stringify({ mode }),
        weatherLocationQuery: false
      });
      applyNorthernBackground(data.background || { mode });
      setStatus("背景设置已保存。");
    } catch {
      setStatus("背景设置保存失败，请稍后重试。");
    }
  }

  async function uploadNorthernBackground(file) {
    if (!file) return;
    const fileError = validateFile(file);
    if (fileError === "type") {
      setStatus("请选择 PNG、JPG、WebP 或 GIF 图片。");
      return;
    }
    if (fileError === "size") {
      setStatus("图片不能超过 8MB。");
      return;
    }
    setStatus("正在上传背景图...");
    try {
      const image = await readFile(file);
      if (isLocalBackgroundRuntime()) {
        applyNorthernBackground({ mode: "custom", imageUrl: image });
        setStatus("背景图已保存并应用。");
        return;
      }
      const data = await api("/api/background/upload", {
        method: "POST",
        body: JSON.stringify({ image }),
        weatherLocationQuery: false
      });
      applyNorthernBackground(data.background || {});
      setStatus("背景图已保存并应用。");
    } catch {
      setStatus("背景图上传失败，请换一张图片再试。");
    } finally {
      if (northernBackgroundInput) northernBackgroundInput.value = "";
    }
  }

  function bindNorthernBackgroundEvents() {
    northernBackgroundOptions.forEach((option) => {
      option.addEventListener("change", () => {
        if (option.checked) saveNorthernBackground(option.value);
      });
    });
    northernBackgroundInput?.addEventListener("change", () => {
      uploadNorthernBackground(northernBackgroundInput.files?.[0]).catch(() => {
        setStatus("背景图上传失败，请换一张图片再试。");
      });
    });
  }

  return {
    applyNorthernBackground,
    bindNorthernBackgroundEvents,
    loadNorthernBackground,
    saveNorthernBackground,
    uploadNorthernBackground
  };
}
