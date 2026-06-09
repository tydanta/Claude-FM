import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export function createNeteaseLocalApiService({
  config,
  rootDir,
  fetchImpl = fetch,
  spawnImpl = spawn,
  nodePath = process.execPath,
  log = console.log,
  warn = console.warn
}) {
  let childProcess = null;

  async function ensureNeteaseLocalApi() {
    const baseUrl = normalizeBaseUrl(config.neteaseApiBaseUrl);
    if (!shouldManageLocalApi(baseUrl, config)) return { managed: false, reason: "not-local" };
    if (await isNeteaseApiReachable(baseUrl, fetchImpl)) return { managed: true, started: false, baseUrl };

    const appPath = path.join(rootDir, "node_modules", "NeteaseCloudMusicApi", "app.js");
    if (!existsSync(appPath)) {
      warn("Local Netease API dependency is missing. Run npm install before scanning QR login.");
      return { managed: true, started: false, missing: true, baseUrl };
    }

    const url = new URL(baseUrl);
    childProcess = spawnImpl(nodePath, [appPath], {
      cwd: path.dirname(appPath),
      env: {
        ...process.env,
        HOST: url.hostname,
        PORT: url.port || "3000"
      },
      stdio: "ignore",
      windowsHide: true
    });
    childProcess?.unref?.();
    registerShutdownHandlers(childProcess);

    const ready = await waitForNeteaseApi(baseUrl, fetchImpl, Number(config.neteaseLocalApiStartupTimeoutMs || 20000));
    if (ready) {
      log(`Local Netease API is running at ${baseUrl}`);
      return { managed: true, started: true, baseUrl };
    }
    warn(`Local Netease API did not become ready at ${baseUrl}`);
    return { managed: true, started: true, ready: false, baseUrl };
  }

  return {
    ensureNeteaseLocalApi,
    getChildProcess: () => childProcess
  };
}

export function shouldManageLocalApi(baseUrl = "", config = {}) {
  if (String(config.neteaseLocalApiEnabled || "true").toLowerCase() === "false") return false;
  try {
    const url = new URL(baseUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

async function isNeteaseApiReachable(baseUrl, fetchImpl) {
  try {
    const response = await fetchImpl(new URL("/", baseUrl), { signal: AbortSignal.timeout(2000) });
    return response.status > 0;
  } catch {
    return false;
  }
}

async function waitForNeteaseApi(baseUrl, fetchImpl, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isNeteaseApiReachable(baseUrl, fetchImpl)) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

function normalizeBaseUrl(value = "") {
  return String(value || "").replace(/\/$/, "");
}

function registerShutdownHandlers(childProcess) {
  if (!childProcess?.pid) return;
  const stop = () => {
    try {
      childProcess.kill();
    } catch {}
  };
  process.once("exit", stop);
  process.once("SIGINT", () => {
    stop();
    process.exit(130);
  });
  process.once("SIGTERM", () => {
    stop();
    process.exit(143);
  });
}
