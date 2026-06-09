import assert from "node:assert/strict";
import { createChatRuntimeController } from "../public/modules/claudio/chatRuntimeController.js";

function createInput(value = "") {
  return {
    focused: false,
    value,
    focus() {
      this.focused = true;
    }
  };
}

function createMessage(role, content, options = {}) {
  return {
    role,
    content,
    options,
    attributes: {},
    classList: {
      values: new Set(),
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      }
    },
    dataset: {},
    removed: false,
    remove() {
      this.removed = true;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    }
  };
}

function createHarness({ inputValue = "", apiResult, apiError } = {}) {
  const calls = {
    api: [],
    appended: [],
    resolved: [],
    notices: [],
    cleared: [],
    pages: []
  };
  const chatInput = createInput(inputValue);
  const controller = createChatRuntimeController({
    elements: { chatInput },
    api: async (url, options) => {
      calls.api.push({ url, options });
      if (apiError) throw apiError;
      return apiResult || { message: { content: "ok" } };
    },
    appendChatMessage: (role, content, options) => {
      const message = createMessage(role, content, options);
      calls.appended.push(message);
      return message;
    },
    resolvePendingChatMessage: (message, content, voice) => {
      message.classList.remove("is-thinking");
      message.removeAttribute("aria-live");
      message.content = content;
      message.dataset.speakText = content;
      if (voice?.audioUrl) {
        message.dataset.voiceUrl = voice.audioUrl;
        message.dataset.voiceMime = voice.mimeType || "";
      }
      calls.resolved.push({ message, content, voice });
      return message;
    },
    renderClaudioNotice: (message, options) => {
      calls.notices.push({ message, options });
    },
    clearClaudioNotice: (key) => calls.cleared.push(key),
    getFriendlyModelError: (reason) => `friendly:${reason}`,
    getTrack: () => ({ id: "track-1" }),
    getPreferences: () => ({ energy: "soft" }),
    getVoiceSettings: () => ({ preset: "Mia" }),
    getLocation: () => ({ city: "Shanghai" }),
    setAppPage: (page) => calls.pages.push(page)
  });
  return { calls, chatInput, controller };
}

{
  const { calls, controller } = createHarness({ inputValue: "   " });
  await controller.handleChatSubmit({ preventDefault() {} });

  assert.equal(calls.api.length, 0);
  assert.equal(calls.appended.length, 0);
}

{
  const { calls, chatInput, controller } = createHarness({
    inputValue: "  hi Claudio  ",
    apiResult: {
      message: { content: "hello back" },
      voice: { audioUrl: "/voice.wav", mimeType: "audio/wav" }
    }
  });

  await controller.handleChatSubmit({ preventDefault() {} });

  assert.equal(chatInput.value, "");
  assert.equal(calls.appended[0].role, "user");
  assert.equal(calls.appended[0].content, "hi Claudio");
  assert.equal(calls.appended[1].role, "assistant");
  assert.equal(calls.appended[1].classList.contains("is-thinking"), false);
  assert.equal(calls.resolved[0].message, calls.appended[1]);
  assert.equal(calls.resolved[0].content, "hello back");
  assert.equal(calls.appended[1].dataset.voiceUrl, "/voice.wav");
  assert.equal(calls.appended[1].dataset.voiceMime, "audio/wav");
  assert.equal(calls.cleared[0], "chat-error");
  assert.equal(calls.api[0].url, "/api/chat");
  assert.equal(calls.api[0].options.method, "POST");
  assert.equal(calls.api[0].options.timeoutMs, 35000);
  assert.deepEqual(JSON.parse(calls.api[0].options.body), {
    message: "hi Claudio",
    track: { id: "track-1" },
    preferences: { energy: "soft" },
    voiceSettings: { preset: "Mia" },
    location: { city: "Shanghai" }
  });
}

{
  const { calls, controller } = createHarness({
    inputValue: "needs fallback",
    apiResult: {
      replyError: "deepseek_empty",
      message: { content: "local reply" }
    }
  });

  await controller.handleChatSubmit({ preventDefault() {} });

  assert.equal(calls.notices[0].message, "friendly:deepseek_empty");
  assert.equal(calls.notices[0].options.key, "chat-error");
  assert.equal(calls.notices[0].options.actionLabel, "打开设置");
  calls.notices[0].options.action();
  assert.deepEqual(calls.pages, ["settings"]);
  assert.equal(calls.resolved[0].content, "local reply");
}

{
  const { calls, chatInput, controller } = createHarness({
    inputValue: "retry me",
    apiError: new Error("network down")
  });

  await controller.handleChatSubmit({ preventDefault() {} });

  assert.equal(calls.notices[0].message, "friendly:network down");
  assert.equal(calls.notices[0].options.key, "chat-error");
  assert.equal(calls.notices[0].options.actionLabel, "重试");
  assert.equal(calls.appended[1].removed, true);
  calls.notices[0].options.action();
  assert.equal(chatInput.value, "retry me");
  assert.equal(chatInput.focused, true);
}

console.log("frontend-chat-runtime-controller tests passed");
