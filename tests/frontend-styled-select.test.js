import assert from "node:assert/strict";
import {
  getStyledSelectOptions,
  renderStyledSelectMenu
} from "../public/modules/settings/styledSelect.js";

const select = {
  options: [
    { value: "a", textContent: "Alpha", selected: false, disabled: false },
    { value: "b", textContent: "Beta", selected: true, disabled: true }
  ]
};

assert.deepEqual(getStyledSelectOptions(select), [
  { value: "a", label: "Alpha", selected: false, disabled: false },
  { value: "b", label: "Beta", selected: true, disabled: true }
]);

const html = renderStyledSelectMenu([
  { value: "a&b", label: "<Alpha>", selected: true, disabled: false },
  { value: "c", label: "Gamma", selected: false, disabled: true }
]);
assert.match(html, /data-select-value="a&amp;b"/);
assert.match(html, /&lt;Alpha&gt;/);
assert.match(html, /is-active/);
assert.match(html, /disabled/);

console.log("frontend-styled-select tests passed");
