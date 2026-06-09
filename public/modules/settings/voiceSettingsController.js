import {
  getCustomVoiceName,
  normalizeCustomVoiceItems
} from "../chat/customVoices.js";
import {
  getResolvedVoiceSettings,
  presetVoiceOptionValue,
  renderCustomVoiceOptions,
  renderVoicePresetOptions
} from "./voiceSettings.js";

export function createVoiceSettingsController({
  elements = {},
  presets = [],
  readStorage = () => "",
  writeStorage = () => {},
  createId = () => "",
  syncStyledSelect = () => {},
  presetFallback = presets[0]?.voiceId || "冰糖",
  editPlaceholder = "修改描述后可以保存到当前自定义音色。",
  createPlaceholder = "例如：温柔、低沉、像深夜电台男 DJ，语速稍慢，情绪稳定。"
} = {}) {
  const {
    voicePresetSelect,
    voiceCustomSelect,
    voiceCustomPrompt
  } = elements;

  function getCustomVoiceItems() {
    try {
      const items = JSON.parse(readStorage("claudio-custom-voices") || "[]");
      return normalizeCustomVoiceItems(items, { createId });
    } catch {
      return [];
    }
  }

  function saveCustomVoiceItems(items) {
    writeStorage("claudio-custom-voices", JSON.stringify(items));
  }

  function getSelectedCustomVoice() {
    const selectedId = voiceCustomSelect?.value || presetVoiceOptionValue;
    if (selectedId === presetVoiceOptionValue) return null;
    return getCustomVoiceItems().find((item) => item.id === selectedId) || null;
  }

  function renderCustomVoiceSelect(selectedId = readStorage("claudio-custom-voice-id") || presetVoiceOptionValue) {
    if (!voiceCustomSelect) return;
    const items = getCustomVoiceItems();
    const activeId = items.some((item) => item.id === selectedId) ? selectedId : presetVoiceOptionValue;
    voiceCustomSelect.innerHTML = renderCustomVoiceOptions(items);
    voiceCustomSelect.value = activeId;
    const activeItem = items.find((item) => item.id === activeId);
    if (voiceCustomPrompt) {
      voiceCustomPrompt.value = activeItem?.prompt || "";
      voiceCustomPrompt.placeholder = activeItem ? editPlaceholder : createPlaceholder;
    }
    writeStorage("claudio-custom-voice-id", activeId === presetVoiceOptionValue ? "" : activeId);
    syncStyledSelect(voiceCustomSelect);
  }

  function getVoiceSettings() {
    const storedPreset = readStorage("claudio-voice-preset") || presetFallback;
    const selectedPreset = voicePresetSelect?.value || storedPreset;
    return getResolvedVoiceSettings({
      storedPreset,
      selectedPreset,
      presets,
      customVoice: getSelectedCustomVoice()
    });
  }

  function saveVoiceSettings() {
    const settings = getVoiceSettings();
    writeStorage("claudio-voice-preset", settings.preset);
    const customVoice = getSelectedCustomVoice();
    writeStorage("claudio-custom-voice-id", customVoice?.id || "");
    writeStorage("claudio-voice-custom", customVoice?.prompt || "");
  }

  function saveCurrentCustomVoice() {
    const prompt = (voiceCustomPrompt?.value || "").trim();
    if (!prompt) return;
    const items = getCustomVoiceItems();
    const selectedId = voiceCustomSelect?.value || presetVoiceOptionValue;
    let activeId = selectedId;
    if (selectedId && selectedId !== presetVoiceOptionValue) {
      const existing = items.find((item) => item.id === selectedId);
      if (existing) {
        existing.prompt = prompt;
        existing.name = getCustomVoiceName(prompt);
      }
    } else {
      activeId = createId("custom-voice");
      items.push({
        id: activeId,
        name: getCustomVoiceName(prompt),
        prompt
      });
    }
    saveCustomVoiceItems(items);
    writeStorage("claudio-custom-voice-id", activeId);
    renderCustomVoiceSelect(activeId);
    saveVoiceSettings();
  }

  function deleteCurrentCustomVoice() {
    const selectedId = voiceCustomSelect?.value || presetVoiceOptionValue;
    if (selectedId === presetVoiceOptionValue) return;
    const items = getCustomVoiceItems().filter((item) => item.id !== selectedId);
    saveCustomVoiceItems(items);
    writeStorage("claudio-custom-voice-id", "");
    renderCustomVoiceSelect(presetVoiceOptionValue);
    saveVoiceSettings();
  }

  function initVoiceSettings() {
    if (!voicePresetSelect) return;
    voicePresetSelect.innerHTML = renderVoicePresetOptions(presets);
    const storedPreset = readStorage("claudio-voice-preset") || presetFallback;
    const hasStoredPreset = presets.some((voice) => voice.voiceId === storedPreset);
    voicePresetSelect.value = hasStoredPreset ? storedPreset : presetFallback;
    const legacyPrompt = readStorage("claudio-voice-custom");
    if (legacyPrompt && !getCustomVoiceItems().length) {
      const id = createId("custom-voice");
      saveCustomVoiceItems([{ id, name: getCustomVoiceName(legacyPrompt), prompt: legacyPrompt }]);
      writeStorage("claudio-custom-voice-id", id);
    }
    renderCustomVoiceSelect();
    saveVoiceSettings();
    syncStyledSelect(voicePresetSelect);
  }

  return {
    deleteCurrentCustomVoice,
    getCustomVoiceItems,
    getSelectedCustomVoice,
    getVoiceSettings,
    initVoiceSettings,
    renderCustomVoiceSelect,
    saveCurrentCustomVoice,
    saveCustomVoiceItems,
    saveVoiceSettings
  };
}
