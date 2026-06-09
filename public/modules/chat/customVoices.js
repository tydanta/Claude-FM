export function normalizeCustomVoiceItems(items, { createId = () => "" } = {}) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(Boolean)
    .map((item) => ({
      id: String(item.id || createId()).trim(),
      name: String(item.name || "自定义音色").trim(),
      prompt: String(item.prompt || "").trim()
    }))
    .filter((item) => item.id && item.prompt);
}

export function getCustomVoiceName(prompt) {
  const clean = String(prompt || "").replace(/\s+/g, " ").trim();
  if (!clean) return "自定义音色";
  // 名称用于 select 选项展示，过长时截断但保留完整 prompt 参与真正的音色生成。
  return clean.length > 12 ? `${clean.slice(0, 12)}...` : clean;
}
