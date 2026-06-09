import assert from "node:assert/strict";
import {
  applyApiSettingsToForm,
  buildApiSettingsPayload
} from "../public/modules/settings/settingsController.js";

function createInput({ value = "", secret = false } = {}) {
  return {
    value,
    type: secret ? "password" : "text",
    dataset: {},
    matches(selector) {
      return secret && selector === "[data-secret-input]";
    },
    closest() {
      return { querySelector: () => ({ textContent: "Secret" }) };
    }
  };
}

{
  const remoteCapabilityBaseUrl = createInput();
  const openaiKey = createInput({ secret: true });
  let synced = false;
  applyApiSettingsToForm({
    settings: {
      remoteCapabilityBaseUrl: "https://fm.example.com",
      openaiKey: "masked"
    },
    inputs: {
      remoteCapabilityBaseUrl,
      openaiKey
    },
    documentRef: { querySelector: () => ({ classList: { remove() {} }, setAttribute() {} }) },
    syncAllStyledSelects: () => {
      synced = true;
    }
  });
  assert.equal(remoteCapabilityBaseUrl.value, "https://fm.example.com");
  assert.equal(openaiKey.dataset.maskedValue, "masked");
  assert.equal(synced, true);
}

{
  const payload = buildApiSettingsPayload({
    remoteCapabilityBaseUrl: createInput({ value: " https://fm.example.com/ " }),
    openaiBaseUrl: createInput({ value: "https://api.example.com" }),
    empty: createInput({ value: " " })
  });
  assert.deepEqual(payload, {
    remoteCapabilityBaseUrl: "https://fm.example.com/",
    openaiBaseUrl: "https://api.example.com"
  });
}

console.log("frontend-settings-controller tests passed");
