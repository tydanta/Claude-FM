import {
  buildEqualizerMarkup,
  calculateEqualizerHeights,
  getNextSilentFrameCount
} from "./equalizerController.js";

export function createEqualizerRuntimeController({
  elements = {},
  audio = null,
  windowRef = window,
  consoleRef = console,
  haveFutureData = 3,
  barCount = 90
} = {}) {
  const { equalizer } = elements;
  let audioContext = null;
  let audioAnalyser = null;
  let audioSourceNode = null;
  let equalizerFrame = 0;
  let equalizerData = null;
  let equalizerBars = [];
  let equalizerUnavailable = false;
  let equalizerSilentFrames = 0;
  let equalizerStartToken = 0;

  function buildEqualizer() {
    if (!equalizer) return;
    equalizer.innerHTML = buildEqualizerMarkup(barCount);
    equalizerBars = Array.from(equalizer.querySelectorAll(".eq-bar"));
    setEqualizerVisible(false);
  }

  function setEqualizerVisible(visible) {
    if (!equalizer) return;
    equalizer.classList.toggle("is-hidden", !visible);
  }

  function setEqualizerHeights(height = 0) {
    equalizerBars.forEach((bar) => {
      bar.style.setProperty("--h", String(height));
    });
  }

  function stopEqualizer({ hide = false } = {}) {
    if (equalizerFrame) {
      windowRef.cancelAnimationFrame(equalizerFrame);
      equalizerFrame = 0;
    }
    equalizerSilentFrames = 0;
    setEqualizerHeights(0);
    if (hide) setEqualizerVisible(false);
  }

  function markEqualizerUnavailable() {
    equalizerUnavailable = true;
    stopEqualizer({ hide: true });
  }

  async function initAudioAnalyser() {
    if (equalizerUnavailable) return false;
    if (!equalizer || !equalizerBars.length) return false;
    if (!windowRef.AudioContext && !windowRef.webkitAudioContext) {
      markEqualizerUnavailable();
      return false;
    }
    try {
      if (!audioContext) {
        const AudioContextCtor = windowRef.AudioContext || windowRef.webkitAudioContext;
        audioContext = new AudioContextCtor();
      }
      if (!audioSourceNode) {
        audioSourceNode = audioContext.createMediaElementSource(audio);
        audioAnalyser = audioContext.createAnalyser();
        audioAnalyser.fftSize = 256;
        audioAnalyser.smoothingTimeConstant = 0.72;
        audioSourceNode.connect(audioAnalyser);
        audioAnalyser.connect(audioContext.destination);
        equalizerData = new Uint8Array(audioAnalyser.frequencyBinCount);
      }
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      return Boolean(audioAnalyser && equalizerData);
    } catch (error) {
      consoleRef.warn("audio analyser unavailable", error);
      markEqualizerUnavailable();
      return false;
    }
  }

  function renderEqualizerFrame(token) {
    if (token !== equalizerStartToken || !audioAnalyser || !equalizerData || audio?.paused || audio?.ended) {
      return;
    }
    try {
      audioAnalyser.getByteFrequencyData(equalizerData);
    } catch (error) {
      consoleRef.warn("audio analyser read failed", error);
      markEqualizerUnavailable();
      return;
    }

    let peak = 0;
    const binCount = equalizerData.length;
    const heights = calculateEqualizerHeights(equalizerData, equalizerBars.length);
    const usableBins = Math.max(1, Math.floor(binCount * 0.78));
    equalizerBars.forEach((bar, index) => {
      const start = Math.floor((index / equalizerBars.length) * usableBins);
      const end = Math.max(start + 1, Math.floor(((index + 1) / equalizerBars.length) * usableBins));
      let sum = 0;
      for (let bin = start; bin < end; bin += 1) {
        sum += equalizerData[bin] || 0;
      }
      peak = Math.max(peak, sum / (end - start));
      bar.style.setProperty("--h", String(heights[index] || 1));
    });

    equalizerSilentFrames = getNextSilentFrameCount(peak, equalizerSilentFrames);
    if (equalizerSilentFrames > 120 && audio?.readyState >= haveFutureData) {
      stopEqualizer({ hide: true });
      return;
    }

    setEqualizerVisible(true);
    equalizerFrame = windowRef.requestAnimationFrame(() => renderEqualizerFrame(token));
  }

  async function startEqualizer() {
    // Remote music URLs can be cross-origin. Routing the media element through
    // Web Audio may silence playback when the browser blocks analyser access.
    // Keep playback untouched and hide the stage equalizer instead of faking it.
    equalizerStartToken += 1;
    stopEqualizer({ hide: true });
  }

  function getStartToken() {
    return equalizerStartToken;
  }

  function getState() {
    return {
      frame: equalizerFrame,
      startToken: equalizerStartToken,
      unavailable: equalizerUnavailable,
      silentFrames: equalizerSilentFrames,
      barCount: equalizerBars.length
    };
  }

  return {
    buildEqualizer,
    getStartToken,
    getState,
    initAudioAnalyser,
    markEqualizerUnavailable,
    renderEqualizerFrame,
    setEqualizerHeights,
    setEqualizerVisible,
    startEqualizer,
    stopEqualizer
  };
}
