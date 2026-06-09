import assert from "node:assert/strict";
import { getFriendlyModelError } from "../public/modules/chat/friendlyErrors.js";

assert.equal(
  getFriendlyModelError("401 invalid api key"),
  "DeepSeek API Key 认证失败，当前保存的密钥已经无效或填错了。请到设置里更新 DeepSeek API Key。"
);

assert.equal(
  getFriendlyModelError("Rate limit: insufficient quota"),
  "DeepSeek 当前额度或频率受限，请稍后再试，或检查账号额度。"
);

assert.equal(
  getFriendlyModelError(new Error("fetch aborted by timeout")),
  "DeepSeek 网络请求超时或连接失败，稍后重试即可。"
);

assert.equal(
  getFriendlyModelError(null),
  "DeepSeek 暂时没有返回可用结果，Claudio 会先用本地兜底回复。"
);

console.log("frontend-friendly-errors tests passed");
