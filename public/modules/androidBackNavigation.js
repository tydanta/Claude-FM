const PRIMARY_PAGES = new Set(["radio", "mine"]);

export function getAndroidBackNavigationAction({
  page = "radio",
  mineView = "list",
  playerReturnPage = "radio"
} = {}) {
  if (page === "mine" && mineView !== "list") {
    return { action: "mine-list" };
  }

  if (page === "mine") {
    return { action: "page", page: "radio" };
  }

  if (page === "player") {
    return {
      action: "page",
      page: PRIMARY_PAGES.has(playerReturnPage) ? playerReturnPage : "radio"
    };
  }

  if (page === "settings" || page === "artist") {
    return { action: "page", page: "mine" };
  }

  if (page === "album") {
    return { action: "page", page: "artist" };
  }

  if (page === "radio") {
    return { action: "exit" };
  }

  return { action: "page", page: "radio" };
}

export function createAndroidBackNavigationController({
  appPlugin,
  documentRef = document,
  getPlayerReturnPage = () => "radio",
  getBackTarget = () => null,
  restoreBackTarget = () => {},
  setAppPage = () => {},
  showMineList = () => {},
  showArtistList = () => {},
  exitApp = () => appPlugin?.exitApp?.()
} = {}) {
  function handleBackButton() {
    const backTarget = getBackTarget();
    if (backTarget) {
      Promise.resolve(restoreBackTarget(backTarget)).catch(() => {});
      return;
    }

    const action = getAndroidBackNavigationAction({
      page: documentRef.body.dataset.page || "radio",
      mineView: documentRef.body.dataset.mineView || "list",
      playerReturnPage: getPlayerReturnPage()
    });

    if (action.action === "mine-list") {
      showMineList();
      return;
    }

    if (action.action === "page") {
      if (documentRef.body.dataset.page === "artist") {
        showArtistList();
      }
      setAppPage(action.page);
      return;
    }

    exitApp();
  }

  function bindAndroidBackNavigation() {
    if (!appPlugin?.addListener) return null;
    return appPlugin.addListener("backButton", handleBackButton);
  }

  return {
    bindAndroidBackNavigation,
    handleBackButton
  };
}
