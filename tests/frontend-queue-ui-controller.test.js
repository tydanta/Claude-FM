import assert from "node:assert/strict";
import { createQueueUiController } from "../public/modules/player/queueUiController.js";
import { renderQueueModeControls } from "../public/modules/player/playerView.js";
import { escapeHtml, formatTime } from "../public/modules/ui/formatting.js";

function createClassList() {
  return {
    values: new Set(),
    add(name) {
      this.values.add(name);
    },
    remove(name) {
      this.values.delete(name);
    },
    toggle(name, force) {
      const enabled = Boolean(force);
      if (enabled) this.values.add(name);
      else this.values.delete(name);
      return enabled;
    },
    contains(name) {
      return this.values.has(name);
    }
  };
}

function createElement({ small = null, currentItem = null } = {}) {
  return {
    attributes: {},
    classList: createClassList(),
    dataset: {},
    hidden: true,
    innerHTML: "",
    textContent: "",
    offsetTop: 0,
    offsetHeight: 40,
    clientHeight: 120,
    scrollHeight: 360,
    scrollCalls: [],
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    querySelector(selector) {
      if (selector === ".queue-popover-head small") return small;
      if (selector === ".queue-panel-item.is-current") return currentItem;
      return null;
    },
    scrollTo(options) {
      this.scrollCalls.push(options);
    }
  };
}

function createHarness({ queue = [], currentIndex = 0, nextIndex = 1, playMode = "order" } = {}) {
  const calls = { raf: [], timeouts: [], clear: [] };
  const queueCount = createElement();
  const playerCount = createElement();
  const sheetCount = createElement();
  const currentItem = { offsetTop: 180, offsetHeight: 40 };
  const elements = {
    body: createElement(),
    queueList: createElement(),
    queueToggle: createElement(),
    queuePopover: createElement({ small: queueCount }),
    queuePanelList: createElement({ currentItem }),
    nextTrackTitle: createElement(),
    playerQueueBtn: createElement(),
    playerQueuePanel: createElement({ small: playerCount }),
    playerQueueList: createElement({ currentItem }),
    queueSheet: createElement({ small: sheetCount }),
    queueSheetList: createElement({ currentItem }),
    queueSheetMode: createElement()
  };
  const controller = createQueueUiController({
    elements,
    getQueue: () => queue,
    getCurrentIndex: () => currentIndex,
    getNextPlaybackIndex: () => nextIndex,
    getPlayMode: () => playMode,
    renderQueueModeControls,
    escapeHtml,
    formatTime,
    requestAnimationFrameFn(callback) {
      calls.raf.push(callback);
      callback();
      return calls.raf.length;
    },
    setTimeoutFn(callback, delay) {
      calls.timeouts.push({ callback, delay });
      return calls.timeouts.length;
    },
    clearTimeoutFn(timer) {
      calls.clear.push(timer);
    }
  });
  return { calls, controller, elements, queueCount, playerCount, sheetCount };
}

const queue = [
  { id: "a", title: "Alpha <One>", artist: "Ada", mood: "Focus", duration: 65, source: "netease", sourceId: "1" },
  { id: "b", title: "Beta", artist: "Ben", mood: "Calm", duration: 125, source: "local" }
];

{
  const { controller, elements } = createHarness({ queue, currentIndex: 1 });

  controller.renderQueue(queue);

  assert.match(elements.queueList.innerHTML, /data-track-index="1"/);
  assert.match(elements.queueList.innerHTML, /now-playing/);
  assert.match(elements.queueList.innerHTML, /Alpha &lt;One&gt;/);
}

{
  const { controller, elements, queueCount, playerCount } = createHarness({ queue, currentIndex: 0, nextIndex: 1 });

  controller.renderQueueDock(queue);

  assert.equal(queueCount.textContent, "2 首");
  assert.equal(playerCount.textContent, "2 首");
  assert.equal(elements.nextTrackTitle.textContent, "Beta - Ben");
  assert.match(elements.queuePanelList.innerHTML, /data-queue-mode/);
  assert.match(elements.queuePanelList.innerHTML, /data-remove-index="1"/);
  assert.match(elements.playerQueueList.innerHTML, /data-player-remove-index="1"/);
  assert.match(elements.queuePanelList.innerHTML, /is-current/);
  assert.match(elements.playerQueueList.innerHTML, /<span class="queue-panel-index">1<\/span>/);
  assert.doesNotMatch(elements.playerQueueList.innerHTML, /<span class="queue-panel-index">01<\/span>/);
}

{
  const { controller, elements, queueCount } = createHarness({ queue: [] });

  controller.renderQueueDock([]);
  controller.renderGlobalQueueSheet([]);

  assert.equal(queueCount.textContent, "0 首");
  assert.equal(elements.nextTrackTitle.textContent, "暂无队列");
  assert.equal(elements.queuePanelList.innerHTML, "");
  assert.equal(elements.queueSheetList.innerHTML, "");
}

{
  const { calls, controller, elements } = createHarness({ queue });

  controller.setQueueOpen(true);

  assert.equal(elements.queuePopover.hidden, false);
  assert.equal(elements.queueToggle.attributes["aria-expanded"], "true");
  assert.equal(elements.body.classList.contains("queue-open"), true);
  assert.equal(elements.queuePopover.classList.contains("is-open"), true);
  assert.deepEqual(elements.queuePanelList.scrollCalls[0], { top: 140, behavior: "smooth" });

  controller.setQueueOpen(false);
  assert.equal(elements.queueToggle.attributes["aria-expanded"], "false");
  assert.equal(elements.body.classList.contains("queue-open"), false);
  assert.equal(calls.timeouts.at(-1).delay, 260);
  calls.timeouts.at(-1).callback();
  assert.equal(elements.queuePopover.hidden, true);
}

{
  const { controller, elements } = createHarness({ queue });

  controller.setPlayerQueueOpen(true);
  assert.equal(elements.playerQueuePanel.hidden, false);
  assert.equal(elements.playerQueueBtn.attributes["aria-expanded"], "true");
  assert.equal(elements.body.classList.contains("player-queue-open"), true);
  assert.equal(elements.playerQueueList.scrollCalls.length, 0);
  assert.equal(elements.playerQueuePanel.classList.contains("is-open"), true);

  controller.setPlayerQueueOpen(false);
  assert.equal(elements.playerQueueBtn.attributes["aria-expanded"], "false");
  assert.equal(elements.body.classList.contains("player-queue-open"), false);
}

{
  const { calls, controller, elements } = createHarness({ queue });

  controller.setPlayerQueueOpen(true);
  assert.equal(calls.timeouts.length, 1);
  assert.equal(calls.timeouts[0].delay, 120);
  assert.equal(elements.playerQueueList.scrollCalls.length, 0);
  calls.timeouts[0].callback();
  assert.deepEqual(elements.playerQueueList.scrollCalls[0], { top: 140, behavior: "smooth" });

  controller.setQueueSheetOpen(true);
  assert.equal(elements.queueSheet.hidden, false);
  assert.equal(elements.queuePopover.classList.contains("is-open"), false);
  assert.equal(elements.playerQueuePanel.classList.contains("is-open"), false);
  assert.equal(elements.body.classList.contains("queue-sheet-open"), true);
}

console.log("frontend-queue-ui-controller tests passed");

