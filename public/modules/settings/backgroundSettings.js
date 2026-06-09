export function normalizeNorthernBackground(settings = {}) {
  const mode = ["dark", "light", "custom"].includes(settings.mode) ? settings.mode : "dark";
  return {
    mode,
    imageUrl: String(settings.imageUrl || "")
  };
}

export function getNorthernBackgroundPayload(mode, imageUrl = "") {
  const normalized = normalizeNorthernBackground({ mode, imageUrl });
  return {
    mode: normalized.mode,
    imageUrl: normalized.mode === "custom" ? normalized.imageUrl : ""
  };
}

export function validateNorthernBackgroundFile(file) {
  if (!file) return "missing";
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type || "")) return "type";
  if (file.size > 8 * 1024 * 1024) return "size";
  return "";
}

export function applyNorthernBackgroundToDom({
  settings = {},
  body,
  options = [],
  preview,
  setTheme,
  writeStorage
}) {
  const { mode, imageUrl } = normalizeNorthernBackground(settings);
  body.dataset.northern = mode;
  setTheme(mode === "light" ? "light" : "dark");
  if (mode === "custom" && imageUrl) {
    const escapedUrl = imageUrl.replace(/"/g, "%22");
    body.style.setProperty("--northern-bg-image", `url("${escapedUrl}")`);
    if (preview) preview.style.backgroundImage = `url("${escapedUrl}")`;
  } else {
    body.style.removeProperty("--northern-bg-image");
    if (preview) preview.style.backgroundImage = "";
  }
  options.forEach((option) => {
    option.checked = option.value === mode;
  });
  writeStorage("claudio-northern-mode", mode);
  writeStorage("claudio-northern-image", mode === "custom" ? imageUrl : "");
}

export function readFileAsDataUrl(file, FileReaderCtor = FileReader) {
  return new Promise((resolve, reject) => {
    const reader = new FileReaderCtor();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}
