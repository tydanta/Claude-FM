import crypto from "node:crypto";
import path from "node:path";

export function createMediaCacheKey(parts = []) {
  return crypto.createHash("sha1").update(parts.map((part) => String(part ?? "")).join("|")).digest("hex");
}

export function buildCoverSizedUrl(sourceUrl, size) {
  const url = new URL(String(sourceUrl || ""));
  const safeSize = normalizeCoverSize(size);
  url.search = "";
  url.searchParams.set("param", `${safeSize}y${safeSize}`);
  return url.toString();
}

export function normalizeCoverSize(size) {
  const numericSize = Number(size);
  const allowedSizes = [140, 200, 240, 300, 600, 800, 1000];
  if (!Number.isFinite(numericSize)) return 200;
  return allowedSizes.reduce((nearest, candidate) =>
    Math.abs(candidate - numericSize) < Math.abs(nearest - numericSize) ? candidate : nearest
  , allowedSizes[0]);
}

export function buildShardedCachePath(rootDir, cacheKey, extension) {
  const safeKey = String(cacheKey || "").replace(/[^a-f0-9]/gi, "").toLowerCase();
  const shard = safeKey.slice(0, 2) || "00";
  const safeExtension = String(extension || "").startsWith(".") ? String(extension || "") : `.${extension || "bin"}`;
  return path.join(rootDir, shard, `${safeKey}${safeExtension}`);
}

export function parseRangeHeader(rangeHeader, totalBytes) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader || "").trim());
  const total = Number(totalBytes);
  if (!match || !Number.isFinite(total) || total <= 0) return null;
  const start = match[1] === "" ? 0 : Number(match[1]);
  const end = match[2] === "" ? total - 1 : Number(match[2]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= total) return null;
  const boundedEnd = Math.min(end, total - 1);
  return {
    start,
    end: boundedEnd,
    chunkSize: boundedEnd - start + 1
  };
}

export function isAllowedNeteaseMediaUrl(sourceUrl) {
  try {
    const url = new URL(String(sourceUrl || ""));
    return /^https?:$/.test(url.protocol) && /(^|\.)music\.126\.net$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function pickLruCacheVictims(items = [], maxBytes = 0) {
  const limit = Number(maxBytes);
  const totalBytes = items.reduce((sum, item) => sum + Math.max(0, Number(item.bytes || 0)), 0);
  if (!Number.isFinite(limit) || limit <= 0 || totalBytes <= limit) return [];
  let removableBytes = totalBytes - limit;
  const victims = [];
  const candidates = items
    .filter((item) => !item.protected)
    .sort((a, b) => Number(a.lastAccessAt || 0) - Number(b.lastAccessAt || 0));
  for (const item of candidates) {
    if (removableBytes <= 0) break;
    victims.push(item.cacheKey);
    removableBytes -= Math.max(0, Number(item.bytes || 0));
  }
  return victims;
}
