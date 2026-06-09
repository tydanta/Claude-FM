import assert from "node:assert/strict";
import {
  defaultVoicePresetOptions,
  getResolvedVoiceSettings,
  renderVoicePresetOptions
} from "../public/modules/settings/voiceSettings.js";

assert.equal(defaultVoicePresetOptions[0].voiceId, "冰糖");
assert.equal(renderVoicePresetOptions([{ voiceId: "Mia", name: "Mia", languageLabel: "英文", gender: "女性" }]), '<option value="Mia">Mia / Mia / 英文 / 女性</option>');

assert.deepEqual(
  getResolvedVoiceSettings({
    storedPreset: "missing",
    selectedPreset: "",
    presets: defaultVoicePresetOptions,
    customVoice: { prompt: "深夜电台" }
  }),
  { preset: "冰糖", customPrompt: "深夜电台", language: "zh" }
);

assert.deepEqual(
  getResolvedVoiceSettings({
    storedPreset: "Mia",
    selectedPreset: "Dean",
    presets: defaultVoicePresetOptions,
    customVoice: null
  }),
  { preset: "Dean", customPrompt: "", language: "en" }
);

console.log("frontend-voice-settings tests passed");
