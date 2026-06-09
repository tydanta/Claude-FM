export function applyApiSettingsToForm({
  settings = {},
  inputs = {},
  documentRef = document,
  syncAllStyledSelects = () => {}
}) {
  Object.entries(inputs).forEach(([key, input]) => {
    if (!input) return;
    input.value = settings[key] || "";
    if (input.matches("[data-secret-input]")) {
      input.type = "password";
      input.dataset.maskedValue = settings[key] || "";
      const button = documentRef.querySelector(`[data-secret-toggle="${input.id}"]`);
      button?.classList.remove("is-visible");
      button?.setAttribute("aria-label", `显示 ${input.closest("label")?.querySelector("span")?.textContent || "API KEY"}`);
    }
  });
  syncAllStyledSelects();
}

export function buildApiSettingsPayload(inputs = {}) {
  const body = {};
  Object.entries(inputs).forEach(([key, input]) => {
    if (!input) return;
    const value = input.value.trim();
    if (input.matches("[data-secret-input]") && (!value || value === input.dataset.maskedValue || /\*{2,}/.test(value))) {
      return;
    }
    if (value) body[key] = value;
  });
  return body;
}
