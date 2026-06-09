import assert from "node:assert/strict";
import { createCapabilityController } from "../public/modules/claudio/capabilityController.js";

function createTextElement() {
  return {
    textContent: "",
    attributes: new Map(),
    classList: {
      values: new Set(),
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      }
    },
    querySelector(selector) {
      if (selector === "span") return this.span;
      if (selector === "strong") return this.strong;
      return null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    },
    getAttribute(name) {
      return this.attributes.get(name);
    }
  };
}

function createCapabilityLine() {
  const line = createTextElement();
  line.span = createTextElement();
  line.strong = createTextElement();
  return line;
}

function createHarness(options = {}) {
  const body = { dataset: {} };
  const elements = {
    statusEls: {
      insight: createTextElement(),
      chat: createTextElement(),
      voice: createTextElement(),
      cache: createTextElement()
    },
    djOnlineDot: createTextElement(),
    capabilityLine: createCapabilityLine(),
    capabilityModel: createTextElement(),
    capabilityCache: createTextElement(),
    capabilityTtl: createTextElement()
  };
  const controller = createCapabilityController({
    ...elements,
    documentRef: { body },
    remoteCapabilityBaseUrl: options.remoteCapabilityBaseUrl || "",
    fetchWithTimeout: options.fetchWithTimeout,
    getRemoteProxyUrl: (path) => `/proxy${path}`,
    formatBytes: (bytes) => `${bytes}B`
  });
  return { body, elements, controller };
}

{
  const { body, elements, controller } = createHarness();

  controller.renderIntegrations({ openai: true, claude: false, fishAudio: false });
  await controller.refreshCapabilities();

  assert.equal(elements.statusEls.insight.textContent, "local");
  assert.equal(elements.statusEls.chat.textContent, "local");
  assert.equal(elements.statusEls.voice.textContent, "browser");
  assert.equal(elements.statusEls.cache.textContent, "--");
  assert.equal(elements.capabilityLine.strong.textContent, "local only");
  assert.equal(elements.capabilityModel.textContent, "local");
  assert.equal(body.dataset.capabilityRefresh, "local");
  assert.equal(elements.djOnlineDot.getAttribute("aria-label"), "DJ 在线");
}

{
  const { body, elements, controller } = createHarness({
    remoteCapabilityBaseUrl: "https://fm.example.test",
    fetchWithTimeout: async (url) => ({
      ok: true,
      url,
      json: async () => ({
        models: {
          insight: { enabled: true, model: "gpt-test" },
          chat: { enabled: false, model: "chat-off" },
          voice: { enabled: true, provider: "mimo" }
        },
        cache: {
          insight: { files: 2, bytes: 100 },
          voice: { files: 3, bytes: 50 }
        },
        ttlHours: { insight: 12, voice: 24 }
      })
    })
  });

  await controller.refreshCapabilities();

  assert.equal(elements.statusEls.insight.textContent, "gpt-test");
  assert.equal(elements.statusEls.chat.textContent, "off");
  assert.equal(elements.statusEls.voice.textContent, "mimo");
  assert.equal(elements.statusEls.cache.textContent, "150B");
  assert.equal(elements.capabilityLine.span.textContent, "Capability server");
  assert.equal(elements.capabilityLine.strong.textContent, "fm.example.test");
  assert.equal(elements.capabilityModel.textContent, "gpt-test");
  assert.equal(elements.capabilityCache.textContent, "2/3 项 150B");
  assert.equal(elements.capabilityTtl.textContent, "12h / 24h");
  assert.equal(body.dataset.capabilityRefresh, "ok");
}

{
  const { body, elements, controller } = createHarness({
    remoteCapabilityBaseUrl: "https://fm.example.test",
    fetchWithTimeout: async () => ({ ok: false, status: 503 })
  });

  await controller.refreshCapabilities();

  assert.equal(elements.statusEls.insight.textContent, "offline");
  assert.equal(elements.statusEls.chat.textContent, "offline");
  assert.equal(elements.statusEls.voice.textContent, "offline");
  assert.equal(elements.statusEls.cache.textContent, "--");
  assert.equal(elements.capabilityLine.strong.textContent, "offline");
  assert.equal(elements.capabilityModel.textContent, "offline");
  assert.equal(body.dataset.capabilityRefresh, "error");
}

console.log("frontend-capability-controller tests passed");
