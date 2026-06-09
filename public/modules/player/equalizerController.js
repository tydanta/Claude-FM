export function buildEqualizerMarkup(barCount = 90) {
  return Array.from({ length: barCount })
    .map((_, index) => `<span class="eq-bar" style="--h:0; --i:${index}"></span>`)
    .join("");
}

export function calculateEqualizerHeights(frequencyData, barCount, { usableRatio = 0.78 } = {}) {
  const binCount = frequencyData?.length || 0;
  const usableBins = Math.max(1, Math.floor(binCount * usableRatio));
  return Array.from({ length: barCount }).map((_, index) => {
    const start = Math.floor((index / barCount) * usableBins);
    const end = Math.max(start + 1, Math.floor(((index + 1) / barCount) * usableBins));
    let sum = 0;
    for (let bin = start; bin < end; bin += 1) {
      sum += frequencyData[bin] || 0;
    }
    const value = sum / (end - start);
    const normalized = Math.pow(value / 255, 0.72);
    return Math.max(1, Math.round(normalized * 58));
  });
}

export function getNextSilentFrameCount(peak, currentCount) {
  return peak < 2 ? currentCount + 1 : 0;
}
