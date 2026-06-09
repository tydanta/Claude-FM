import assert from "node:assert/strict";
import path from "node:path";
import {
  createConfig,
  envKeyMap,
  parseEnvFileContent,
  runtimeConfigKeys
} from "../src/server/config.js";

const parsed = parseEnvFileContent(`
# comment
PORT=4000
OPENAI_API_KEY="abc"
EMPTY=
NO_SEPARATOR
`);

assert.deepEqual(parsed, {
  PORT: "4000",
  OPENAI_API_KEY: "abc",
  EMPTY: ""
});

const rootDir = "D:/app";
const config = createConfig({
  env: {
    PORT: "3999",
    DATA_DIR: "D:/data",
    CACHE_DIR: "D:/cache",
    OPENAI_BASE_URL: "https://api.deepseek.com/",
    REMOTE_CAPABILITY_BASE_URL: "https://fm.example.com/",
    CORS_ORIGINS: "http://localhost:3088, https://example.com "
  },
  rootDir
});

assert.equal(config.port, 3999);
assert.equal(config.dataDir, "D:/data");
assert.equal(config.cacheDir, "D:/cache");
assert.equal(config.dbPath, path.join("D:/data", "claude-fm.sqlite"));
assert.equal(config.openaiBaseUrl, "https://api.deepseek.com");
assert.equal(config.openaiChatPath, "/chat/completions");
assert.equal(config.remoteCapabilityBaseUrl, "https://fm.example.com");
assert.equal(config.neteaseApiBaseUrl, "http://127.0.0.1:3010");
assert.equal(config.neteaseLocalApiEnabled, "true");
assert.equal(config.neteaseLocalApiStartupTimeoutMs, 20000);
assert.equal(config.neteaseApiTimeoutMs, 20000);
assert.deepEqual(config.corsOrigins, ["http://localhost:3088", "https://example.com"]);

assert.equal(runtimeConfigKeys.has("openaiKey"), true);
assert.equal(runtimeConfigKeys.has("remoteCapabilityBaseUrl"), true);
assert.equal(envKeyMap.openaiKey, "OPENAI_API_KEY");
assert.equal(envKeyMap.remoteCapabilityBaseUrl, "REMOTE_CAPABILITY_BASE_URL");

console.log("config tests passed");
