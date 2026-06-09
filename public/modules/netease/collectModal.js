import { escapeHtml } from "../ui/formatting.js";
import { getPlaylistCover } from "./playlistView.js";

export function getCollectablePlaylists(playlists = []) {
  return playlists.filter((playlist) => playlist.source === "netease" && playlist.sourceId);
}

export function renderCollectPlaylistCards(playlists = [], getCoverUrl) {
  return playlists
    .map((playlist) => `
      <button class="collect-playlist-card" type="button" data-collect-playlist-id="${escapeHtml(playlist.sourceId)}">
        <span class="collect-playlist-cover" style="${getPlaylistCover(playlist, getCoverUrl)}" aria-hidden="true"></span>
        <span>${escapeHtml(playlist.title || "")}</span>
        <small>${playlist.trackCount || playlist.tracks?.length || 0} 首</small>
      </button>
    `)
    .join("");
}
