import { escapeHtml } from "../ui/formatting.js";

export function renderSearchPreviewItems(songs = []) {
  return songs
    .map((track, index) => `
      <div class="search-preview-item" data-search-source-id="${escapeHtml(track.sourceId || "")}" data-search-index="${index}">
        <button class="search-preview-main" type="button" data-search-play>
          <span class="search-preview-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="mine-track-copy">
            <strong>${escapeHtml(track.title || "")}</strong>
            <span>${escapeHtml(track.artist || "未知歌手")}</span>
          </span>
        </button>
        <button class="search-preview-action" type="button" data-search-play>播放</button>
        <button class="search-preview-action" type="button" data-search-collect>收藏</button>
        <button class="search-preview-action" type="button" data-search-next>下首</button>
      </div>
    `)
    .join("");
}

export function getSearchPageTitle(query = "") {
  return query ? `搜索「${query}」` : "搜索音乐";
}

export function getSearchPageCount(count = 0, hasMore = false) {
  return `${count} 首${hasMore ? "，继续滑动加载" : ""}`;
}
