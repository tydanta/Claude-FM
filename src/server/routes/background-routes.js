import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { mimeTypes } from "../http-utils.js";

export function registerBackgroundRoutes(router, {
  backgroundDir,
  getNorthernSettings,
  saveNorthernSettings,
  saveNorthernBackgroundImage,
  parseBody,
  sendJson
}) {
  router.get("/api/background", async ({ res }) => {
    sendJson(res, 200, {
      ok: true,
      background: getNorthernSettings()
    });
  });

  router.post("/api/background", async ({ req, res }) => {
    sendJson(res, 200, {
      ok: true,
      background: saveNorthernSettings(await parseBody(req))
    });
  });

  router.post("/api/background/upload", async ({ req, res }) => {
    try {
      sendJson(res, 200, {
        ok: true,
        background: await saveNorthernBackgroundImage(await parseBody(req))
      });
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        ok: false,
        error: error.message || "Background upload failed"
      });
    }
  });

  if (backgroundDir) {
    router.getPrefix("/api/background/image/", ({ res, pathTail }) => {
      const fileName = path.basename(decodeURIComponent(pathTail));
      const filePath = path.normalize(path.join(backgroundDir, fileName));
      const root = path.normalize(backgroundDir);
      if (!filePath.startsWith(`${root}${path.sep}`) || !existsSync(filePath)) {
        sendJson(res, 404, { error: "Background image not found" });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        "content-type": mimeTypes[ext] || "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable"
      });
      createReadStream(filePath).pipe(res);
    });
  }
}
