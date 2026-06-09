import assert from "node:assert/strict";
import { createVoiceSettingsController } from "../public/modules/settings/voiceSettingsController.js";
import { presetVoiceOptionValue } from "../public/modules/settings/voiceSettings.js";

function createSelect() {
  return {
    innerHTML: "",
    value: "",
    options: []
  };
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    read(key) {
      return values.get(key) || "";
    },
    write(key, value) {
      values.set(key, String(value));
    },
    dump() {
      return Object.fromEntries(values.entries());
    }
  };
}

const presets = [
  { name: "Ice", voiceId: "Ice", language: "zh", languageLabel: "Chinese", gender: "Female" },
  { name: "Dean", voiceId: "Dean", language: "en", languageLabel: "English", gender: "Male" }
];

{
  const storage = createStorage({
    "claudio-custom-voices": JSON.stringify([{ id: "warm", name: "Warm", prompt: " warm radio " }]),
    "claudio-custom-voice-id": "warm",
    "claudio-voice-preset": "Dean"
  });
  const elements = {
    voicePresetSelect: createSelect(),
    voiceCustomSelect: createSelect(),
    voiceCustomPrompt: { value: "", placeholder: "" }
  };
  const synced = [];
  const controller = createVoiceSettingsController({
    elements,
    presets,
    readStorage: storage.read,
    writeStorage: storage.write,
    createId: () => "generated",
    syncStyledSelect: (select) => synced.push(select)
  });

  controller.initVoiceSettings();

  assert.equal(elements.voicePresetSelect.value, "Dean");
  assert.equal(elements.voiceCustomSelect.value, "warm");
  assert.equal(elements.voiceCustomPrompt.value, "warm radio");
  assert.equal(storage.dump()["claudio-custom-voice-id"], "warm");
  assert.deepEqual(controller.getVoiceSettings(), {
    preset: "Dean",
    customPrompt: "warm radio",
    language: "en"
  });
  assert.equal(synced.includes(elements.voicePresetSelect), true);
  assert.equal(synced.includes(elements.voiceCustomSelect), true);
}

{
  const storage = createStorage();
  const elements = {
    voicePresetSelect: createSelect(),
    voiceCustomSelect: createSelect(),
    voiceCustomPrompt: { value: "  midnight host  ", placeholder: "" }
  };
  const controller = createVoiceSettingsController({
    elements,
    presets,
    readStorage: storage.read,
    writeStorage: storage.write,
    createId: () => "custom-1",
    syncStyledSelect: () => {}
  });

  controller.saveCurrentCustomVoice();

  assert.equal(elements.voiceCustomSelect.value, "custom-1");
  assert.deepEqual(JSON.parse(storage.dump()["claudio-custom-voices"]), [
    { id: "custom-1", name: "midnight hos...", prompt: "midnight host" }
  ]);
  assert.equal(storage.dump()["claudio-custom-voice-id"], "custom-1");

  elements.voiceCustomPrompt.value = "updated voice";
  controller.saveCurrentCustomVoice();
  assert.deepEqual(JSON.parse(storage.dump()["claudio-custom-voices"]), [
    { id: "custom-1", name: "updated voic...", prompt: "updated voice" }
  ]);

  controller.deleteCurrentCustomVoice();
  assert.equal(elements.voiceCustomSelect.value, presetVoiceOptionValue);
  assert.deepEqual(JSON.parse(storage.dump()["claudio-custom-voices"]), []);
  assert.equal(storage.dump()["claudio-custom-voice-id"], "");
}

{
  const storage = createStorage({
    "claudio-voice-custom": "legacy prompt"
  });
  const elements = {
    voicePresetSelect: createSelect(),
    voiceCustomSelect: createSelect(),
    voiceCustomPrompt: { value: "", placeholder: "" }
  };
  const controller = createVoiceSettingsController({
    elements,
    presets,
    readStorage: storage.read,
    writeStorage: storage.write,
    createId: () => "legacy-1",
    syncStyledSelect: () => {}
  });

  controller.initVoiceSettings();

  assert.equal(elements.voiceCustomSelect.value, "legacy-1");
  assert.deepEqual(JSON.parse(storage.dump()["claudio-custom-voices"]), [
    { id: "legacy-1", name: "legacy promp...", prompt: "legacy prompt" }
  ]);
}

console.log("frontend-voice-settings-controller tests passed");
