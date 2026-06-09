import { escapeHtml } from "../ui/formatting.js";

export const presetVoiceOptionValue = "__preset__";

export const defaultVoicePresetOptions = [
  { name: "冰糖", voiceId: "冰糖", language: "zh", languageLabel: "中文", gender: "女性" },
  { name: "茉莉", voiceId: "茉莉", language: "zh", languageLabel: "中文", gender: "女性" },
  { name: "苏打", voiceId: "苏打", language: "zh", languageLabel: "中文", gender: "男性" },
  { name: "白桦", voiceId: "白桦", language: "zh", languageLabel: "中文", gender: "男性" },
  { name: "Mia", voiceId: "Mia", language: "en", languageLabel: "英文", gender: "女性" },
  { name: "Chloe", voiceId: "Chloe", language: "en", languageLabel: "英文", gender: "女性" },
  { name: "Milo", voiceId: "Milo", language: "en", languageLabel: "英文", gender: "男性" },
  { name: "Dean", voiceId: "Dean", language: "en", languageLabel: "英文", gender: "男性" }
];

export function renderVoicePresetOptions(options = defaultVoicePresetOptions) {
  return options
    .map((voice) => `<option value="${escapeHtml(voice.voiceId)}">${escapeHtml(voice.name)} / ${escapeHtml(voice.voiceId)} / ${escapeHtml(voice.languageLabel)} / ${escapeHtml(voice.gender)}</option>`)
    .join("");
}

export function getResolvedVoiceSettings({
  storedPreset = "冰糖",
  selectedPreset = "",
  presets = defaultVoicePresetOptions,
  customVoice = null
} = {}) {
  const requestedPreset = selectedPreset || storedPreset || "冰糖";
  const presetInfo = presets.find((voice) => voice.voiceId === requestedPreset) || presets[0];
  const customPrompt = customVoice?.prompt || "";
  return {
    preset: presetInfo.voiceId,
    customPrompt,
    language: presetInfo.language
  };
}

export function renderCustomVoiceOptions(items = []) {
  return [
    `<option value="${presetVoiceOptionValue}">使用预置音色</option>`,
    ...items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
  ].join("");
}
