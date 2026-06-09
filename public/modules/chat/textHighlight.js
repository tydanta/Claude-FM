export function tokenizeForHighlight(text, { intlRef = globalThis.Intl } = {}) {
  const value = String(text || "");
  if (!value) return [];

  const normalizePart = (part) => ({
    text: part,
    highlight: Boolean(part && !/^\s+$/.test(part) && !/^[，。！？；：、,.!?;:]$/.test(part))
  });
  const splitReadablePart = (part) => {
    if (!/[\u4e00-\u9fff]/.test(part) || part.length <= 2) return [part];
    return part.match(/.{1,2}/gu) || [part];
  };

  if (intlRef?.Segmenter) {
    const segmenter = new intlRef.Segmenter("zh-CN", { granularity: "word" });
    return [...segmenter.segment(value)]
      .map(({ segment }) => segment)
      .filter(Boolean)
      .flatMap(splitReadablePart)
      .map(normalizePart);
  }

  // 无 Intl.Segmenter 时退回到确定性拆分，保证歌词/洞察高亮仍可逐段推进。
  return value
    .split(/(\s+|[\u4e00-\u9fff]|[，。！？；：、,.!?;:])/)
    .filter(Boolean)
    .map(normalizePart);
}
