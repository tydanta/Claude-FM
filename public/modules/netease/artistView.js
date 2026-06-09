import { escapeHtml } from "../ui/formatting.js";

export function renderArtistPager(page, totalPages, type) {
  if (totalPages <= 1) return "";
  return `
    <button type="button" data-artist-page="${type}" data-page-dir="-1" ${page <= 1 ? "disabled" : ""}>上一页</button>
    <span>${page} / ${totalPages}</span>
    <button type="button" data-artist-page="${type}" data-page-dir="1" ${page >= totalPages ? "disabled" : ""}>下一页</button>
  `;
}

export function selectArtistHeroImage(artist = {}, songs = []) {
  return artist.avatar || artist.picUrl || artist.img1v1Url || artist.avatarUrl || artist.cover || artist.pic || songs[0]?.cover || "";
}

export function getArtistDescription(artist = {}, fallbackName = "", songCount = 0) {
  return artist.briefDesc || artist.alias?.join(" / ") || `网易云歌手主页，共加载 ${songCount} 首热门歌曲。`;
}

export function renderArtistAlbums(albums = [], getCoverUrl) {
  if (!albums.length) return `<div class="mine-empty">没有匹配的专辑</div>`;
  return albums
    .map((album) => `
      <button class="artist-album-card" type="button" data-album-id="${escapeHtml(album.id || "")}" data-album-name="${escapeHtml(album.name || "")}">
        <span class="artist-album-cover" style="${album.picUrl ? `background-image:url('${getCoverUrl(album.picUrl, "grid")}')` : ""}"></span>
        <strong>${escapeHtml(album.name || "未命名专辑")}</strong>
        <small>${album.publishTime ? new Date(album.publishTime).getFullYear() : ""}</small>
      </button>
    `)
    .join("");
}
