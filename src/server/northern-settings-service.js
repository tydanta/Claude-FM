import { mkdir, writeFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

export function createNorthernSettingsService({
  backgroundDir,
  getKv,
  setKv,
  now = () => Date.now(),
  randomHex = () => crypto.randomBytes(5).toString("hex")
}) {
  function getNorthernSettings() {
    const fallback = { mode: "dark", imageUrl: "" };
    try {
      const saved = JSON.parse(getKv("northern.settings", JSON.stringify(fallback)));
      const mode = ["dark", "light", "custom"].includes(saved?.mode) ? saved.mode : fallback.mode;
      return {
        mode,
        imageUrl: mode === "custom" ? String(saved?.imageUrl || "") : ""
      };
    } catch {
      return fallback;
    }
  }

  function saveNorthernSettings(settings = {}) {
    let mode = ["dark", "light", "custom"].includes(settings.mode) ? settings.mode : "dark";
    const imageUrl = mode === "custom" ? String(settings.imageUrl || "").trim() : "";
    if (mode === "custom" && !imageUrl) mode = "dark";
    const next = { mode, imageUrl };
    setKv("northern.settings", JSON.stringify(next));
    return next;
  }

  async function saveNorthernBackgroundImage(body = {}) {
    const dataUrl = String(body.image || "");
    const match = dataUrl.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
    if (!match) {
      const error = new Error("Unsupported image format");
      error.statusCode = 400;
      throw error;
    }
    const mimeType = match[1].toLowerCase();
    const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
      const error = new Error("Image is too large");
      error.statusCode = 400;
      throw error;
    }
    const extensions = {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/webp": ".webp",
      "image/gif": ".gif"
    };
    const extension = extensions[mimeType] || ".png";
    const fileName = `northern-${now()}-${randomHex()}${extension}`;
    await mkdir(backgroundDir, { recursive: true });
    await writeFile(path.join(backgroundDir, fileName), buffer);
    return saveNorthernSettings({
      mode: "custom",
      imageUrl: `/api/background/image/${encodeURIComponent(fileName)}`
    });
  }

  return {
    getNorthernSettings,
    saveNorthernSettings,
    saveNorthernBackgroundImage
  };
}
