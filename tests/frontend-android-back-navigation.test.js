import assert from "node:assert/strict";
import {
  createAndroidBackNavigationController,
  getAndroidBackNavigationAction
} from "../public/modules/androidBackNavigation.js";

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "radio", mineView: "list" }),
  { action: "exit" },
  "home page should allow the second back press to exit"
);

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "mine", mineView: "list" }),
  { action: "page", page: "radio" },
  "mine list should return to home before exiting"
);

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "mine", mineView: "detail" }),
  { action: "mine-list" },
  "playlist detail should return to the mine top-level page"
);

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "mine", mineView: "search" }),
  { action: "mine-list" },
  "search results should return to the mine top-level page"
);

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "player", playerReturnPage: "mine" }),
  { action: "page", page: "mine" },
  "player detail should return to its primary page"
);

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "settings" }),
  { action: "page", page: "mine" },
  "settings should return to mine"
);

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "artist" }),
  { action: "page", page: "mine" },
  "artist detail should return to mine"
);

assert.deepEqual(
  getAndroidBackNavigationAction({ page: "album" }),
  { action: "page", page: "artist" },
  "album detail should return to artist detail"
);

{
  const restored = [];
  const target = { page: "mine", mineView: "detail", playlistId: "playlist-1" };
  const controller = createAndroidBackNavigationController({
    appPlugin: {},
    documentRef: { body: { dataset: { page: "artist", mineView: "list" } } },
    getBackTarget: () => target,
    restoreBackTarget: (nextTarget) => restored.push(nextTarget),
    setAppPage: () => restored.push({ page: "fallback" }),
    showArtistList: () => restored.push({ page: "artist-list" }),
    exitApp: () => restored.push({ page: "exit" })
  });

  controller.handleBackButton();

  assert.deepEqual(
    restored,
    [target],
    "android back should restore the previous real navigation target before fallback rules"
  );
}

console.log("frontend android back navigation tests passed");
