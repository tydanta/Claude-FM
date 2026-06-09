export function parseLyricTime(minute, second, fraction = "") {
  const base = Number(minute) * 60 + Number(second);
  if (!fraction) return base;
  const value = String(fraction).slice(0, 3).padEnd(3, "0");
  return base + Number(value) / 1000;
}

export function extractJsonLyricLine(line) {
  const value = String(line || "").trim();
  if (!value.startsWith("{")) return null;
  try {
    const item = JSON.parse(value);
    const text = Array.isArray(item.c)
      ? item.c.map((part) => part?.tx || "").join("").trim()
      : "";
    if (!text && !Number.isFinite(Number(item.t))) return null;
    return {
      time: Math.max(0, Number(item.t || 0) / 1000),
      text
    };
  } catch {
    return null;
  }
}

export function extractYrcLyricLine(line) {
  const value = String(line || "").trim();
  const match = value.match(/^\[(-?\d+),(\d+)\]/);
  if (!match) return null;
  const text = value
    .replace(/^\[-?\d+,\d+\]/, "")
    .replace(/\(-?\d+,\d+,\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return {
    time: Math.max(0, Number(match[1]) / 1000),
    text,
    isCredit: isLyricCreditLine(text)
  };
}

export function isLyricCreditLine(text = "") {
  return /^(作词人|作曲人|编曲人|作词|作曲|编曲|制作人|词|曲)\s*[:：]/.test(text)
    || /^(lyricist|lyrics|composer|composition|music|arranger|arranged by|producer|produced by|written by|composed by)\s*[:：]?/i.test(text);
}

export function parseLyricText(rawText = "") {
  const parsedLines = [];
  String(rawText || "")
    .split(/\r?\n/)
    .forEach((line, sourceIndex) => {
      const rawLine = String(line || "").trim();
      if (!rawLine) return;
      const jsonLine = extractJsonLyricLine(line);
      if (jsonLine) {
        parsedLines.push({ ...jsonLine, sourceIndex });
        return;
      }
      const yrcLine = extractYrcLyricLine(line);
      if (yrcLine) {
        parsedLines.push({ ...yrcLine, sourceIndex });
        return;
      }

      const matches = [...line.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
      if (!matches.length) {
        if (isLyricCreditLine(rawLine)) {
          parsedLines.push({ time: 0, text: rawLine, sourceIndex, isCredit: true });
        }
        return;
      }
      const text = line.replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g, "").trim();
      if (!text) return;
      matches.forEach((match) => {
        parsedLines.push({
          time: parseLyricTime(match[1], match[2], match[3]),
          text,
          sourceIndex,
          isCredit: isLyricCreditLine(text)
        });
      });
    });
  return parsedLines
    .filter((line) => line.text)
    .sort((a, b) => (a.time - b.time) || (a.sourceIndex - b.sourceIndex))
    .map(({ sourceIndex, ...line }) => line);
}

export function mergeTranslatedLyrics(lines, translatedLines) {
  if (!translatedLines.length) return lines;
  return lines.map((line) => {
    const translation = translatedLines.find((item) => Math.abs(item.time - line.time) <= 0.8);
    return {
      ...line,
      translation: translation?.text && translation.text !== line.text ? translation.text : ""
    };
  });
}

export function buildMockLyrics(trackId, lyricMocks = {}) {
  const lines = lyricMocks[trackId] || ["暂无歌词，Claudio 正在听这首歌。"];
  return lines.map((text, index) => ({
    time: index * 12,
    text,
    translation: ""
  }));
}

export function getLyricIndexAt(seconds = 0, activeLyrics = []) {
  if (!activeLyrics.length) return -1;
  let low = 0;
  let high = activeLyrics.length - 1;
  let found = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (activeLyrics[mid].time <= seconds + 0.001) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}
