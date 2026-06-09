import assert from "node:assert/strict";
import { createNavigationShellController } from "../public/modules/navigationShellController.js";

function createClassList() {
  return {
    values: new Set(),
    add(name) {
      this.values.add(name);
    },
    remove(name) {
      this.values.delete(name);
    },
    toggle(name, active) {
      if (active) this.add(name);
      else this.remove(name);
    },
    contains(name) {
      return this.values.has(name);
    }
  };
}

function createPage(page) {
  return {
    dataset: { page },
    hidden: false,
    classList: createClassList(),
    listeners: {},
    addEventListener(type, handler, options) {
      this.listeners[type] = { handler, options };
    }
  };
}

function createTab(pageTarget) {
  return {
    dataset: { pageTarget },
    attributes: {},
    classList: createClassList(),
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
}

function createButton() {
  return {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
}

function createHarness() {
  const calls = {
    enterPlayer: 0,
    leavePlayer: 0,
    pageChanges: [],
    focused: 0,
    searchDismissed: 0
  };
  const timers = [];
  const body = {
    dataset: { page: "radio", mineView: "list" },
    classList: createClassList(),
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      }
    }
  };
  const pages = [createPage("radio"), createPage("mine"), createPage("player")];
  const tabs = [createTab("radio"), createTab("mine"), createTab("player")];
  const minePage = { scrollTop: 180 };
  const mineStickyTop = { offsetHeight: 58, classList: createClassList() };
  const userProfilePanel = { offsetHeight: 220 };
  const musicSearch = {
    focused: false,
    focus() {
      this.focused = true;
      calls.focused += 1;
    }
  };
  const musicSearchResults = { hidden: false };
  const settingsBtn = createButton();
  const settingsBackBtn = createButton();
  const setAppPageWithoutSnapshotCalls = [];
  const eventListeners = {};
  const windowRef = {
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    },
    addEventListener(type, handler) {
      eventListeners[type] = handler;
    },
    clearTimeout(id) {
      const timer = timers.find((item) => item.id === id);
      if (timer) timer.cleared = true;
    },
    setTimeout(handler, delay) {
      const id = timers.length + 1;
      timers.push({ id, handler, delay, cleared: false });
      return id;
    },
    dispatchEvent(event) {
      calls.pageChanges.push(event.detail.page);
    }
  };
  const documentRef = {
    body,
    addEventListener(type, handler) {
      eventListeners[`document:${type}`] = handler;
    },
    querySelector(selector) {
      return selector === "#minePage" ? minePage : null;
    }
  };
  const controller = createNavigationShellController({
    elements: {
      appPages: pages,
      statusTabs: tabs,
      mineStickyTop,
      userProfilePanel,
      musicSearch,
      musicSearchResults,
      settingsBtn,
      settingsBackBtn
    },
    documentRef,
    windowRef,
    getPlayerReturnPageState: () => "radio",
    setPlayerReturnPageState: (value) => {
      calls.returnPage = value;
    },
    onEnterPlayer: () => {
      calls.enterPlayer += 1;
    },
    onLeavePlayer: () => {
      calls.leavePlayer += 1;
    },
    setAppPageWithoutSnapshot: (pageName) => {
      setAppPageWithoutSnapshotCalls.push(pageName);
    }
  });
  return {
    body,
    calls,
    controller,
    eventListeners,
    mineStickyTop,
    musicSearch,
    musicSearchResults,
    pages,
    settingsBackBtn,
    settingsBtn,
    tabs,
    timers,
    windowRef,
    setAppPageWithoutSnapshotCalls
  };
}

{
  const { body, calls, controller, pages, tabs, timers } = createHarness();

  controller.setAppPage("mine");

  assert.equal(body.dataset.page, "mine");
  assert.equal(body.style.values["--page-slide-x"], "28px");
  assert.equal(body.classList.contains("is-page-moving"), true);
  assert.equal(timers[0].delay, 680);
  assert.equal(pages.find((page) => page.dataset.page === "mine").hidden, false);
  assert.equal(pages.find((page) => page.dataset.page === "radio").hidden, true);
  assert.equal(tabs.find((tab) => tab.dataset.pageTarget === "mine").classList.contains("is-active"), true);
  assert.equal(tabs.find((tab) => tab.dataset.pageTarget === "mine").attributes["aria-pressed"], "true");
  assert.equal(calls.leavePlayer, 1);
  assert.deepEqual(calls.pageChanges, ["mine"]);
  assert.equal(calls.returnPage, "mine");

  timers[0].handler();
  assert.equal(body.classList.contains("is-page-moving"), false);
}

{
  const { calls, controller } = createHarness();

  controller.setAppPage("player");

  assert.equal(calls.enterPlayer, 1);
  assert.equal(calls.leavePlayer, 0);
  assert.equal(calls.returnPage, "radio");
}

{
  const { body, controller, mineStickyTop, musicSearch, musicSearchResults } = createHarness();

  controller.setAppPage("mine");
  assert.equal(body.classList.contains("mine-title-pinned"), true);

  controller.setMineSearchOpen(true);
  assert.equal(mineStickyTop.classList.contains("is-search-open"), true);

  controller.setMineSearchOpen(false);
  assert.equal(mineStickyTop.classList.contains("is-search-open"), false);
  assert.equal(musicSearchResults.hidden, true);
  assert.equal(musicSearch.focused, false);
}

{
  const { controller, eventListeners, mineStickyTop, musicSearch } = createHarness();

  controller.bindNavigationShellEvents();
  controller.setAppPage("mine");
  controller.setMineSearchOpen(true);
  musicSearch.value = "";

  eventListeners["document:click"]({
    target: {
      closest(selector) {
        return selector === ".search-page-btn" ? null : null;
      }
    }
  });

  assert.equal(mineStickyTop.classList.contains("is-search-open"), false);
}

{
  const { controller, eventListeners, pages, settingsBackBtn, settingsBtn, tabs, setAppPageWithoutSnapshotCalls } = createHarness();

  controller.bindNavigationShellEvents();

  assert.equal(typeof tabs[1].listeners.click, "function");
  tabs[1].listeners.click();
  assert.equal(tabs[1].classList.contains("is-active"), true);

  eventListeners["claudio:navigate"]({ detail: { page: "player" } });
  assert.equal(tabs[2].classList.contains("is-active"), true);

  assert.equal(pages[0].listeners.scroll.options.passive, true);
  assert.equal(typeof eventListeners.resize, "function");
  assert.equal(typeof settingsBtn.listeners.click, "function");
  assert.equal(typeof settingsBackBtn.listeners.click, "function");
  settingsBackBtn.listeners.click();
  assert.deepEqual(setAppPageWithoutSnapshotCalls, ["mine"]);
}

console.log("frontend-navigation-shell-controller tests passed");
