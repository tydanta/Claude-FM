import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

export function registerVoiceRoutes(router, {
  voiceCacheDir,
  sendJson
}) {
  router.getPrefix("/api/cache/voice/", ({ res, pathTail }) => {
    const fileName = path.basename(decodeURIComponent(pathTail));
    const filePath = path.normalize(path.join(voiceCacheDir, fileName));
    const root = path.normalize(voiceCacheDir);
    if (!filePath.startsWith(`${root}${path.sep}`) || !existsSync(filePath)) {
      sendJson(res, 404, { error: "Voice cache item not found" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": ext === ".mp3" ? "audio/mpeg" : "audio/wav",
      "cache-control": "public, max-age=31536000, immutable"
    });
    createReadStream(filePath).pipe(res);
  });
}
