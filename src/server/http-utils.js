import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

export const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon"
};

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

export function applyCorsHeaders(req, res, corsOrigins = []) {
  const origin = req.headers.origin;
  if (!origin) return;
  if (!corsOrigins.includes("*") && !corsOrigins.includes(origin)) return;
  res.setHeader("access-control-allow-origin", corsOrigins.includes("*") ? "*" : origin);
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("access-control-max-age", "86400");
  res.setHeader("vary", "Origin");
}

export async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

export function getStaticFileTarget(publicDir, pathname) {
  const decodedPath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  const filePath = path.normalize(path.join(publicDir, decodedPath));
  const root = path.normalize(publicDir);
  const allowed = filePath === root || filePath.startsWith(`${root}${path.sep}`);
  if (!allowed) return { allowed: false, filePath };
  const targetPath = existsSync(filePath) ? filePath : path.join(publicDir, "index.html");
  return { allowed: true, filePath: targetPath };
}

export function serveStatic(req, res, url, publicDir) {
  const target = getStaticFileTarget(publicDir, url.pathname);
  if (!target.allowed) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(target.filePath);
  const fileName = path.basename(target.filePath);
  const noCache = [".html", ".css", ".js", ".webmanifest"].includes(ext) || fileName === "sw.js";
  res.writeHead(200, {
    "content-type": mimeTypes[ext] || "application/octet-stream",
    "cache-control": noCache ? "no-cache" : "public, max-age=3600"
  });
  createReadStream(target.filePath).pipe(res);
}
