const pages = ["radio", "mine", "settings", "player", "artist", "album"];
const pageOrder = { radio: 0, mine: 1, artist: 2, album: 3, settings: 4, player: 5 };

export function resolveAppPage(pageName) {
  return pages.includes(pageName) ? pageName : "radio";
}

export function getPlayerReturnPage({ nextPage, previousPage, currentReturnPage = "radio" } = {}) {
  return nextPage !== "player" && previousPage !== "player"
    ? nextPage
    : currentReturnPage;
}

export function getPageSlideOffset(nextPage, previousPage) {
  return `${(pageOrder[nextPage] ?? 0) >= (pageOrder[previousPage] ?? 0) ? 28 : -28}px`;
}
