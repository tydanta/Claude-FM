import {
  getPageSlideOffset,
  getPlayerReturnPage,
  resolveAppPage
} from "./navigation.js";

export function createNavigationShellController({
  elements = {},
  documentRef = document,
  windowRef = window,
  getPlayerReturnPageState = () => "radio",
  setPlayerReturnPageState = () => {},
  onBeforePageChange = () => {},
  onEnterPlayer = () => {},
  onLeavePlayer = () => {},
  setAppPageWithoutSnapshot = () => {}
} = {}) {
  const {
    appPages = [],
    statusTabs = [],
    mineStickyTop,
    userProfilePanel,
    musicSearch,
    musicSearchResults,
    settingsBtn,
    settingsBackBtn
  } = elements;

  function dispatchPageChange(page) {
    const EventCtor = windowRef.CustomEvent || CustomEvent;
    windowRef.dispatchEvent(new EventCtor("claudio:pagechange", { detail: { page } }));
  }

  function updateMineStickyState() {
    if (!mineStickyTop || documentRef.body.dataset.page !== "mine" || documentRef.body.dataset.mineView !== "list") {
      documentRef.body.classList.remove("mine-title-pinned");
      return;
    }
    const minePage = documentRef.querySelector("#minePage");
    const scrollTop = minePage?.scrollTop ?? 0;
    const threshold = Math.max(96, (userProfilePanel?.offsetHeight || 230) - (mineStickyTop?.offsetHeight || 58));
    documentRef.body.classList.toggle("mine-title-pinned", scrollTop >= threshold);
  }

  function setAppPage(pageName) {
    const nextPage = resolveAppPage(pageName);
    const previousPage = documentRef.body.dataset.page || "radio";
    if (nextPage !== previousPage) {
      onBeforePageChange({ previousPage, nextPage });
    }
    setPlayerReturnPageState(getPlayerReturnPage({
      nextPage,
      previousPage,
      currentReturnPage: getPlayerReturnPageState()
    }));
    documentRef.body.style.setProperty("--page-slide-x", getPageSlideOffset(nextPage, previousPage));
    documentRef.body.classList.add("is-page-moving");
    windowRef.clearTimeout(setAppPage.motionTimer);
    setAppPage.motionTimer = windowRef.setTimeout(() => documentRef.body.classList.remove("is-page-moving"), 680);
    documentRef.body.dataset.page = nextPage;
    appPages.forEach((page) => {
      const active = page.dataset.page === nextPage;
      page.hidden = !active;
      page.classList.toggle("is-active", active);
    });
    statusTabs.forEach((tab) => {
      const active = tab.dataset.pageTarget === nextPage;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    if (nextPage === "player") {
      onEnterPlayer();
    } else {
      onLeavePlayer();
    }
    updateMineStickyState();
    dispatchPageChange(nextPage);
  }

  function setMineSearchOpen(open) {
    if (!mineStickyTop) return;
    mineStickyTop.classList.toggle("is-search-open", Boolean(open));
    if (open) {
      windowRef.setTimeout(() => musicSearch?.focus(), 80);
    } else if (musicSearchResults) {
      musicSearchResults.hidden = true;
    }
  }

  function isMineSearchOpen() {
    return Boolean(mineStickyTop?.classList.contains("is-search-open"));
  }

  function toggleMineSearchOpen() {
    const nextOpen = !isMineSearchOpen();
    setMineSearchOpen(nextOpen);
    return nextOpen;
  }

  function closeMineSearchIfEmpty() {
    if (!isMineSearchOpen()) return false;
    if (String(musicSearch?.value || "").trim()) return false;
    setMineSearchOpen(false);
    return true;
  }

  function handleDocumentClickForMineSearch(event) {
    const target = event?.target;
    if (!target?.closest) {
      closeMineSearchIfEmpty();
      return;
    }
    if (target.closest(".mine-search, .mine-search-wrap, .search-page-btn")) return;
    closeMineSearchIfEmpty();
  }

  function bindNavigationShellEvents() {
    statusTabs.forEach((tab) => {
      tab.addEventListener("click", () => setAppPage(tab.dataset.pageTarget));
    });
    windowRef.addEventListener("claudio:navigate", (event) => {
      setAppPage(event.detail?.page);
    });
    appPages.forEach((page) => {
      page.addEventListener("scroll", updateMineStickyState, { passive: true });
    });
    windowRef.addEventListener("resize", updateMineStickyState);
    documentRef.addEventListener?.("click", handleDocumentClickForMineSearch);
    settingsBtn?.addEventListener("click", () => setAppPage("settings"));
    settingsBackBtn?.addEventListener("click", () => setAppPageWithoutSnapshot("mine"));
  }

  return {
    bindNavigationShellEvents,
    closeMineSearchIfEmpty,
    isMineSearchOpen,
    setAppPage,
    setMineSearchOpen,
    toggleMineSearchOpen,
    updateMineStickyState
  };
}
