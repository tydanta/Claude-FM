import { escapeHtml } from "../ui/formatting.js";
import { renderLazyBackgroundAttrs } from "../ui/lazyBackgrounds.js";

export function getPlaylistCoverStyle(tracks = [], getCoverUrl) {
  const covers = tracks.map((track) => getCoverUrl(track?.cover || "", "grid")).filter(Boolean).slice(0, 4);
  if (!covers.length) return "";
  if (covers.length === 1) return `background-image: url('${covers[0]}')`;
  const positions = ["left top", "right top", "left bottom", "right bottom"];
  return [
    `background-image: ${covers.map((cover) => `url('${cover}')`).join(", ")}`,
    `background-size: ${covers.map(() => "50% 50%").join(", ")}`,
    `background-position: ${positions.slice(0, covers.length).join(", ")}`,
    `background-repeat: ${covers.map(() => "no-repeat").join(", ")}`
  ].join("; ");
}

export function getPlaylistCover(playlist, getCoverUrl) {
  if (playlist?.cover) return `background-image: url('${getCoverUrl(playlist.cover, "grid")}')`;
  return getPlaylistCoverStyle(playlist?.tracks || [], getCoverUrl);
}

export function getPlaylistDescription(playlist) {
  const description = String(playlist?.description || "").trim();
  if (description) return description;
  const count = playlist?.trackCount || playlist?.tracks?.length || 0;
  return `共 ${count} 首歌，来自${playlist?.source === "netease" ? "网易云音乐" : "Claude FM"}。`;
}

export function renderPlaylistCards(playlists = [], getCoverUrl, { lazyCovers = false } = {}) {
  if (!playlists.length) return `<div class="mine-empty">没有找到匹配的歌单</div>`;
  return playlists
    .map((playlist) => `
      <button class="playlist-card" type="button" data-playlist-id="${escapeHtml(playlist.id)}">
        <span class="playlist-cover" ${renderLazyBackgroundAttrs(getPlaylistCover(playlist, getCoverUrl), { lazy: lazyCovers })}></span>
        <span class="playlist-copy">
          <strong>${escapeHtml(playlist.title || "")}</strong>
          <span>${escapeHtml(playlist.subtitle || "")}</span>
          <small>${escapeHtml(playlist.description || "")}</small>
        </span>
        <span class="playlist-count">${playlist.trackCount || playlist.tracks?.length || 0} 首</span>
      </button>
    `)
    .join("");
}
