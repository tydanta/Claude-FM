import assert from "node:assert/strict";
import { createClaudioNotices } from "../public/modules/ui/notices.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.className = "";
    this.dataset = {};
    this.innerHTML = "";
    this.listeners = new Map();
    this.parent = null;
    this.scrollTop = 0;
    this.scrollHeight = 120;
  }

  append(child) {
    child.parent = this;
    this.children.push(child);
  }

  remove() {
    if (!this.parent) return;
    this.parent.children = this.parent.children.filter((child) => child !== this);
    this.parent = null;
  }

  querySelector(selector) {
    const noticeKeyMatch = selector.match(/^\[data-notice-key="(.+)"\]$/);
    if (noticeKeyMatch) {
      return this.children.find((child) => child.dataset.noticeKey === noticeKeyMatch[1]) || null;
    }
    if (selector === ".notice-action" && this.innerHTML.includes("notice-action")) {
      return {
        addEventListener: (eventName, handler) => this.listeners.set(eventName, handler),
        click: () => this.listeners.get("click")?.()
      };
    }
    return null;
  }
}

const documentStub = {
  createElement: (tagName) => new FakeElement(tagName)
};

{
  const chatLog = new FakeElement("div");
  const { renderClaudioNotice } = createClaudioNotices({ chatLog, documentRef: documentStub });

  renderClaudioNotice("<需要同步>", { actionLabel: "立即 <同步>", key: "sync" });

  assert.equal(chatLog.children.length, 1);
  assert.equal(chatLog.children[0].className, "claudio-notice");
  assert.equal(chatLog.children[0].dataset.noticeKey, "sync");
  assert.match(chatLog.children[0].innerHTML, /&lt;需要同步&gt;/);
  assert.match(chatLog.children[0].innerHTML, /立即 &lt;同步&gt;/);
  assert.equal(chatLog.scrollTop, 120);
}

{
  const chatLog = new FakeElement("div");
  const { renderClaudioNotice, clearClaudioNotice } = createClaudioNotices({ chatLog, documentRef: documentStub });

  renderClaudioNotice("旧消息", { key: "same" });
  const oldItem = chatLog.children[0];
  renderClaudioNotice("新消息", { key: "same" });

  assert.equal(chatLog.children.length, 1);
  assert.notEqual(chatLog.children[0], oldItem);
  assert.match(chatLog.children[0].innerHTML, /新消息/);

  clearClaudioNotice("same");
  assert.equal(chatLog.children.length, 0);
}

{
  const chatLog = new FakeElement("div");
  let clicked = 0;
  const { renderClaudioNotice } = createClaudioNotices({ chatLog, documentRef: documentStub });

  renderClaudioNotice("可操作", { actionLabel: "执行", action: () => clicked += 1, key: "action" });
  chatLog.children[0].querySelector(".notice-action").click();

  assert.equal(clicked, 1);
}

console.log("frontend-notices tests passed");
