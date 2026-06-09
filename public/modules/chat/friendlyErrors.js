export function getFriendlyModelError(message = "") {
  const text = String(message || "");
  // 把底层模型/网络错误收敛成用户能直接理解的操作提示。
  if (/401|authentication|api key|invalid/i.test(text)) {
    return "DeepSeek API Key 认证失败，当前保存的密钥已经无效或填错了。请到设置里更新 DeepSeek API Key。";
  }
  if (/429|rate limit|quota|insufficient/i.test(text)) {
    return "DeepSeek 当前额度或频率受限，请稍后再试，或检查账号额度。";
  }
  if (/timeout|aborted|network|fetch/i.test(text)) {
    return "DeepSeek 网络请求超时或连接失败，稍后重试即可。";
  }
  return "DeepSeek 暂时没有返回可用结果，Claudio 会先用本地兜底回复。";
}
