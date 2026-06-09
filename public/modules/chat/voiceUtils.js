export function getSpeechChunks(text, chunkTexts) {
  if (Array.isArray(chunkTexts) && chunkTexts.length) {
    return chunkTexts.map(sanitizeVoiceText).filter(Boolean);
  }
  return [sanitizeVoiceText(text)].filter(Boolean);
}

export function sanitizeVoiceText(text) {
  // 语音接口对特殊控制字符和半代理很敏感，请求前统一清洗成可播文本。
  return String(text || "")
    .normalize("NFKC")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2026]/g, "...")
    .replace(/[\u00A0\u2000-\u200D\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
