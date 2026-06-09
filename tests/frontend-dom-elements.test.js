import assert from "node:assert/strict";
import { collectDomElements } from "../public/modules/dom.js";

const queried = [];
const queriedAll = [];
const fakeDocument = {
  querySelector(selector) {
    queried.push(selector);
    return { selector };
  },
  querySelectorAll(selector) {
    queriedAll.push(selector);
    return [{ selector, list: true }];
  }
};

const els = collectDomElements(fakeDocument);

assert.equal(els.audio.selector, "#audio");
assert.equal(els.trackTitle.selector, "#trackTitle");
assert.equal(els.chatForm.selector, "#chatForm");
assert.equal(els.voicePresetSelect.selector, "#voicePresetSelect");
assert.equal(els.collectPlaylistList.selector, "#collectPlaylistList");
assert.equal(els.neteaseLoginMethodsPanel.selector, "#neteaseLoginMethodsPanel");
assert.equal(els.neteasePasswordLoginForm.selector, "#neteasePasswordLoginForm");
assert.equal(els.neteasePasswordSubmitBtn.selector, "#neteasePasswordSubmitBtn");
assert.equal(els.neteasePasswordLoginInputs.mode.selector, "#neteasePasswordMode");
assert.equal(els.neteasePasswordLoginInputs.phone.selector, "#neteasePhoneInput");
assert.equal(els.neteasePasswordLoginInputs.email.selector, "#neteaseEmailInput");
assert.equal(els.neteasePasswordLoginInputs.password.selector, "#neteasePasswordInput");
assert.equal(els.neteasePasswordLoginInputs.captcha.selector, "#neteaseCaptchaInput");
assert.equal(els.neteasePasswordLoginInputs.countrycode.selector, "#neteaseCountryCodeInput");
assert.equal(els.apiSettingsInputs.openaiKey.selector, "#deepseekKeyInput");
assert.equal(els.apiSettingsInputs.remoteCapabilityBaseUrl.selector, "#remoteCapabilityBaseUrlInput");
assert.equal(els.statusEls.voice.selector, "#weatherStatus");
assert.deepEqual(els.appPages, [{ selector: ".app-page", list: true }]);
assert.ok(queried.includes("#playerQueuePanel"));
assert.ok(queriedAll.includes("[data-artist-tab]"));

console.log("frontend-dom-elements tests passed");
