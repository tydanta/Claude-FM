import { PLAY_MODES, getProgressPercent } from "./playbackState.js";

export function buildProgressViewState(currentTime = 0, durationValue = 0, formatTime = (value) => String(value)) {
  const safeCurrent = Math.max(0, Number(currentTime || 0));
  const safeDuration = Math.max(0, Number(durationValue || 0));
  const percent = getProgressPercent(safeCurrent, safeDuration);
  const clamped = Math.max(0, Math.min(100, percent));
  return {
    sliderValue: String(Math.floor(clamped * 10)),
    percent: clamped,
    percentText: `${clamped}%`,
    progressRatio: String(clamped / 100),
    elapsedText: formatTime(safeCurrent),
    durationText: formatTime(safeDuration)
  };
}

export function syncProgressView(elements = {}, options = {}) {
  const state = buildProgressViewState(options.currentTime, options.durationValue, options.formatTime);
  elements.progressInput && (elements.progressInput.value = state.sliderValue);
  elements.progressFill && (elements.progressFill.style.width = state.percentText);
  elements.walker?.style?.setProperty("--progress", state.percentText);
  elements.walker?.style?.setProperty("--progress-ratio", state.progressRatio);
  elements.elapsedLabel && (elements.elapsedLabel.textContent = state.elapsedText);
  elements.durationLabel && (elements.durationLabel.textContent = state.durationText);
  return state;
}

export function getModeButtonView(modeId) {
  const mode = PLAY_MODES.find((item) => item.id === modeId) || PLAY_MODES[0];
  return {
    id: mode.id,
    label: mode.label,
    icon: mode.icon,
    ariaLabel: `播放模式：${mode.label}`
  };
}

export function syncModeButtonView(button, modeId) {
  if (!button) return getModeButtonView(modeId);
  const view = getModeButtonView(modeId);
  button.dataset.mode = view.id;
  button.dataset.modeIcon = view.icon;
  button.setAttribute("aria-label", view.ariaLabel);
  button.title = view.label;
  const label = button.querySelector("span");
  if (label) {
    label.textContent = "";
    label.setAttribute("aria-label", view.label);
    label.style?.setProperty?.("--mode-icon", `url("${view.icon}")`);
  }
  return view;
}

export function renderQueueModeControls(modeId, target = "home") {
  const mode = getModeButtonView(modeId);
  const prefix = target === "player" ? "player-" : "";
  return `
    <div class="queue-sheet-mode-row">
      <button class="queue-sheet-pill" type="button" data-${prefix}queue-mode data-mode="${mode.id}" aria-label="${mode.ariaLabel}" title="${mode.label}">
        <span aria-hidden="true" style="--mode-icon: url('${mode.icon}')"></span>
      </button>
    </div>
  `;
}

export function syncPlayButtonView(elements = {}, playing = false) {
  elements.body?.classList?.toggle("is-playing", Boolean(playing));
  elements.walker?.classList?.toggle("is-idle", !playing);
  const label = playing ? "暂停" : "播放";
  [elements.playButton, elements.playerPlayButton].forEach((button) => {
    button?.setAttribute("aria-label", label);
    button?.setAttribute("title", label);
    if (button) button.title = label;
  });
}

export function getTrackCoverBackground(track, getCoverUrl, size = "player") {
  return track?.cover ? `url("${getCoverUrl(track.cover, size)}")` : "";
}
