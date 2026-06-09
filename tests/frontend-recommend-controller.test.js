import assert from "node:assert/strict";
import { createRecommendController } from "../public/modules/netease/recommendController.js";

function createElement() {
  return {
    hidden: false,
    textContent: "",
    innerHTML: "",
    dataset: {},
    style: {},
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
    }
  };
}

function createHarness({ responses = [] } = {}) {
  const calls = {
    api: [],
    closeTrackMenus: 0,
    prewarm: []
  };
  const elements = {
    radioRecommendPanel: createElement(),
    radioRecommendKicker: createElement(),
    radioRecommendTitle: createElement(),
    historyRecommendBtn: createElement(),
    radioRecommendList: createElement(),
    dailyRecommendMeta: createElement(),
    dailyRecommendCover: createElement(),
    dailyRecommendMonth: createElement(),
    dailyRecommendDay: createElement()
  };
  const controller = createRecommendController({
    ...elements,
    neteaseApi: {
      async getRecommendSongs(params) {
        calls.api.push(params);
        const response = responses.shift();
        if (response instanceof Error) throw response;
        return response || {};
      }
    },
    closeTrackMenus: () => calls.closeTrackMenus += 1,
    getNeteaseCoverProxyUrl: (cover, size) => `/cover/${size}/${cover}`,
    getRecommendPanelState: ({ type, songs, loading }) => ({
      kicker: type,
      title: `${type}-${loading ? "loading" : "ready"}`,
      historyButtonHidden: type === "claude",
      historyButtonText: type === "history" ? "今日推荐" : "历史推荐",
      emptyText: loading ? "loading" : (songs.length ? "" : "empty"),
      songs
    }),
    renderTrackRow: (track, index) => `<button data-track="${index}">${track.title}</button>`,
    prewarmVisibleCovers: (songs, target) => calls.prewarm.push({ songs, target }),
    now: () => new Date("2026-06-04T08:00:00+08:00")
  });
  return { calls, elements, controller };
}

{
  const { elements, controller } = createHarness();

  controller.renderDailyRecommendCard();

  assert.equal(elements.dailyRecommendMonth.textContent, "JUN");
  assert.equal(elements.dailyRecommendDay.textContent, "04");
  assert.equal(elements.dailyRecommendCover.style.backgroundImage, "");
  assert.equal(elements.dailyRecommendCover.classList.contains("has-cover"), false);
}

{
  const songs = [{ title: "Daily One", cover: "daily.jpg" }];
  const { calls, elements, controller } = createHarness({
    responses: [{ songs, date: "2026-06-04", source: "local" }]
  });

  await controller.loadDailyRecommendSongs();

  assert.deepEqual(calls.api[0], { limit: 50 });
  assert.equal(elements.dailyRecommendMeta.textContent, "1 首今日推荐（本地）");
  assert.equal(elements.radioRecommendPanel.dataset.recommendPanel, "daily");
  assert.match(elements.radioRecommendList.innerHTML, /Daily One/);
  assert.equal(calls.prewarm[0].target, "list");
  assert.equal(controller.getRecommendPlaylist("daily").trackCount, 1);
  assert.deepEqual(controller.getRecommendTrackListForPanel(), songs);
}

{
  const songs = [{ title: "History One", cover: "history.jpg" }];
  const { calls, elements, controller } = createHarness({
    responses: [{ songs, date: "2026-06-03" }]
  });

  await controller.loadHistoryRecommendSongs();

  assert.deepEqual(calls.api[0], { date: "yesterday", local: true, limit: 50 });
  assert.equal(elements.radioRecommendPanel.dataset.recommendPanel, "history");
  assert.match(elements.radioRecommendList.innerHTML, /History One/);
  assert.equal(controller.getRecommendPlaylist("history").title, "历史推荐");
}

{
  const { elements, controller } = createHarness({ responses: [new Error("offline")] });

  await controller.loadDailyRecommendSongs();

  assert.equal(elements.dailyRecommendMeta.textContent, "每日推荐读取失败");
  assert.match(elements.radioRecommendList.innerHTML, /每日推荐暂时读取失败/);
}

console.log("frontend-recommend-controller tests passed");
