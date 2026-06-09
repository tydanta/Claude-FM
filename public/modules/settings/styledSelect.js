import { escapeHtml } from "../ui/formatting.js";

export function getStyledSelectOptions(select) {
  return Array.from(select?.options || []).map((option) => ({
    value: option.value,
    label: option.textContent || option.value,
    selected: option.selected,
    disabled: option.disabled
  }));
}

export function renderStyledSelectMenu(options = []) {
  return options
    .map(
      (option) => `
        <button
          class="styled-select-option${option.selected ? " is-active" : ""}"
          type="button"
          data-select-value="${escapeHtml(option.value)}"
          ${option.disabled ? "disabled" : ""}
        >
          <span>${escapeHtml(option.label)}</span>
        </button>
      `
    )
    .join("");
}

export function createStyledSelectController({
  selects = [],
  documentRef = document
} = {}) {
  const styledSelects = new Map();

  function closeStyledSelects(exceptShell = null) {
    styledSelects.forEach(({ shell, trigger, menu }) => {
      if (shell === exceptShell) return;
      shell.classList.remove("is-open");
      shell.closest(".settings-item")?.classList.remove("has-open-select");
      trigger.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    });
  }

  function syncStyledSelect(select) {
    const entry = styledSelects.get(select);
    if (!select || !entry) return;
    const options = getStyledSelectOptions(select);
    const activeOption = options.find((option) => option.selected) || options[0];
    entry.value.textContent = activeOption?.label || "";
    entry.trigger.disabled = select.disabled;
    entry.trigger.setAttribute("aria-label", activeOption?.label ? `当前选择：${activeOption.label}` : "选择");
    entry.menu.innerHTML = renderStyledSelectMenu(options);
  }

  function syncAllStyledSelects() {
    styledSelects.forEach((entry, select) => syncStyledSelect(select));
  }

  function enhanceSelect(select) {
    if (!select || styledSelects.has(select)) return;
    const shell = documentRef.createElement("span");
    shell.className = "styled-select-shell";
    const trigger = documentRef.createElement("button");
    trigger.className = "styled-select-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = `<span class="styled-select-value"></span><span class="styled-select-arrow" aria-hidden="true"></span>`;
    const menu = documentRef.createElement("span");
    menu.className = "styled-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    select.classList.add("native-select-hidden");
    select.parentNode.insertBefore(shell, select);
    shell.appendChild(select);
    shell.appendChild(trigger);
    shell.appendChild(menu);
    const value = trigger.querySelector(".styled-select-value");
    styledSelects.set(select, { shell, trigger, value, menu });

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = shell.classList.contains("is-open");
      closeStyledSelects(shell);
      shell.classList.toggle("is-open", !isOpen);
      shell.closest(".settings-item")?.classList.toggle("has-open-select", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
      menu.hidden = isOpen;
      if (!isOpen) syncStyledSelect(select);
    });

    menu.addEventListener("click", (event) => {
      const option = event.target.closest(".styled-select-option");
      if (!option || option.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      select.value = option.dataset.selectValue || "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncStyledSelect(select);
      closeStyledSelects();
    });

    syncStyledSelect(select);
  }

  function initStyledSelects() {
    selects.forEach(enhanceSelect);
    syncAllStyledSelects();
  }

  return {
    closeStyledSelects,
    enhanceSelect,
    initStyledSelects,
    syncAllStyledSelects,
    syncStyledSelect
  };
}
