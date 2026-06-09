import assert from "node:assert/strict";
import { createSpeechInput } from "../public/modules/chat/speechInput.js";

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeButton {
  constructor() {
    this.classList = new FakeClassList();
    this.attributes = {};
    this.disabled = false;
    this.title = "";
    this.listeners = new Map();
  }

  addEventListener(eventName, handler) {
    this.listeners.set(eventName, handler);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  click() {
    this.listeners.get("click")?.();
  }
}

class FakeInput {
  constructor(value = "") {
    this.value = value;
    this.focusCount = 0;
  }

  focus() {
    this.focusCount += 1;
  }
}

class FakeRecognition {
  static instances = [];

  constructor() {
    this.startCount = 0;
    this.stopCount = 0;
    FakeRecognition.instances.push(this);
  }

  start() {
    this.startCount += 1;
  }

  stop() {
    this.stopCount += 1;
  }
}

{
  const button = new FakeButton();
  const input = new FakeInput();
  createSpeechInput({ sttBtn: button, chatInput: input, windowRef: {} }).initSpeechToText();

  assert.equal(button.disabled, true);
  assert.equal(button.title, "当前浏览器不支持语音输入");
  assert.equal(button.attributes["aria-label"], "语音输入不可用");
}

{
  FakeRecognition.instances = [];
  const button = new FakeButton();
  const input = new FakeInput("原来的话");
  let paused = 0;
  createSpeechInput({
    sttBtn: button,
    chatInput: input,
    windowRef: { SpeechRecognition: FakeRecognition },
    pauseVoiceForUser: () => paused += 1
  }).initSpeechToText();

  const recognition = FakeRecognition.instances[0];
  assert.equal(recognition.lang, "zh-CN");
  assert.equal(recognition.continuous, true);
  assert.equal(recognition.interimResults, true);

  recognition.onstart();
  assert.equal(paused, 1);
  assert.equal(button.classList.contains("is-listening"), true);
  assert.equal(button.attributes["aria-pressed"], "true");
  assert.equal(button.title, "停止语音输入");

  recognition.onresult({
    resultIndex: 0,
    results: [
      { 0: { transcript: " 今天" }, isFinal: true },
      { 0: { transcript: " 想听歌" }, isFinal: false }
    ]
  });

  assert.equal(input.value, "原来的话 今天 想听歌");
  assert.equal(input.focusCount, 1);

  recognition.onend();
  assert.equal(button.classList.contains("is-listening"), false);
  assert.equal(button.attributes["aria-pressed"], "false");
  assert.equal(button.title, "语音转文字");
}

{
  FakeRecognition.instances = [];
  const button = new FakeButton();
  const input = new FakeInput();
  createSpeechInput({
    sttBtn: button,
    chatInput: input,
    windowRef: { webkitSpeechRecognition: FakeRecognition }
  }).initSpeechToText();

  const recognition = FakeRecognition.instances[0];
  button.click();
  assert.equal(recognition.startCount, 1);
  recognition.onstart();
  button.click();
  assert.equal(recognition.stopCount, 1);
  recognition.onerror();
  assert.equal(button.attributes["aria-pressed"], "false");
}

console.log("frontend-speech-input tests passed");
