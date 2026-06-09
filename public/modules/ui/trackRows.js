import { getTrackArtists } from "../netease/artistDisplay.js";
import { getNeteaseCoverProxyUrl } from "../netease/neteaseMedia.js";
import { escapeHtml } from "./formatting.js";
import { renderLazyBackgroundAttrs } from "./lazyBackgrounds.js";

export function getArtistAttrs(artist) {
  return [
    artist?.id ? `data-artist-id="${escapeHtml(artist.id)}"` : "",
    artist?.name ? `data-artist-name="${escapeHtml(artist.name)}"` : ""
  ].filter(Boolean).join(" ");
}

export function renderArtistLinks(track) {
  const artists = getTrackArtists(track);
  const fullName = artists.map((artist) => artist.name).join(" / ");
  const links = artists
    .map((artist, index) => `
      ${index ? '<span class="artist-separator">/</span>' : ""}
      <button class="artist-link" type="button" ${getArtistAttrs(artist)}>${escapeHtml(artist.name)}</button>
    `)
    .join("");
  return `<span class="artist-list" title="${escapeHtml(fullName)}" data-full-artists="${escapeHtml(fullName)}">${links}</span>`;
}

export function getPlainArtistText(track) {
  return getTrackArtists(track).map((artist) => artist.name).join(" / ") || "未知歌手";
}

export function getTrackCoverStyle(track, target = "list") {
  const cover = String(getNeteaseCoverProxyUrl(track?.cover || "", target)).replace(/'/g, "%27");
  return cover ? `style="background-image:url('${escapeHtml(cover)}')"` : "";
}

export function getTrackCoverAttrs(track, target = "list", { lazy = false } = {}) {
  const cover = String(getNeteaseCoverProxyUrl(track?.cover || "", target)).replace(/'/g, "%27");
  const style = cover ? `background-image:url('${cover}')` : "";
  return renderLazyBackgroundAttrs(style, { lazy });
}

const actionButtonMeta = {
  next: { label: "下一首播放", icon: "/icons/nextplay.svg" },
  collect: { label: "收藏歌曲", icon: "/icons/favorite.svg" },
  remove: { label: "取消收藏", icon: "/icons/cancel.svg" }
};

function renderInlineActionButtons(actions = []) {
  const buttons = actions
    .map((action) => {
      const meta = actionButtonMeta[action];
      if (!meta) return "";
      return `
        <button class="track-action-btn" type="button" data-track-action="${action}" aria-label="${meta.label}" title="${meta.label}">
          <span aria-hidden="true" style="--track-action-icon: url('${meta.icon}')"></span>
        </button>
      `;
    })
    .filter(Boolean)
    .join("");
  return buttons ? `<div class="mine-track-actions is-inline">${buttons}</div>` : "";
}

export function renderTrackRow(track, index, options = {}) {
  const {
    queueIndex = -1,
    currentTrackId = "",
    actionLabel = "",
    allowRemove = false,
    actionButtons = null,
    showCover = true,
    lazyCover = false
  } = options;
  const current = track?.id === currentTrackId ? " is-current" : "";
  const removeAction = allowRemove
    ? '<button type="button" data-track-action="remove">从歌单移除</button>'
    : "";
  const inlineActions = Array.isArray(actionButtons) ? renderInlineActionButtons(actionButtons) : "";
  const overflowActions = `
      <div class="mine-track-actions">
        <button class="track-more-btn" type="button" aria-label="更多操作" data-track-more>
          <span aria-hidden="true"></span>
        </button>
        <div class="track-menu" hidden>
          <button type="button" data-track-action="next">下一首播放</button>
          <button type="button" data-track-action="collect">收藏到歌单</button>
          ${removeAction}
        </div>
      </div>
    `;
  return `
    <div class="mine-track-item${current}${showCover ? "" : " no-cover"}" data-track-row data-mine-track-index="${queueIndex}" data-source="${track?.source || ""}" data-source-id="${track?.sourceId || ""}">
      <div class="mine-track-play" role="button" tabindex="0" data-track-play>
        <span class="mine-track-index">${String(index + 1).padStart(2, "0")}</span>
        ${showCover ? `<span class="mine-track-cover" ${getTrackCoverAttrs(track, "list", { lazy: lazyCover })} aria-hidden="true" data-player-open></span>` : ""}
        <span class="mine-track-copy">
          <strong data-player-open>${escapeHtml(track?.title || "")}</strong>
          ${renderArtistLinks(track)}
        </span>
        <span class="mine-track-mood">${escapeHtml(actionLabel || track?.mood || "")}</span>
      </div>
      ${inlineActions || overflowActions}
    </div>
  `;
}

export function getTrackFromElement(row, { queue = [], trackGroups = [] } = {}) {
  if (!row) return null;
  if (row.__track) return row.__track;
  const sourceId = row.dataset?.sourceId || row.dataset?.searchSourceId || "";
  const queueIndex = Number(row.dataset?.mineTrackIndex);
  if (sourceId) {
    const matchedTrack = trackGroups.flat().find((track) => String(track?.sourceId || "") === String(sourceId));
    if (matchedTrack) return matchedTrack;
    const title = row.querySelector?.(".mine-track-copy strong")?.textContent?.trim() || "";
    const artist =
      row.querySelector?.(".artist-list")?.getAttribute?.("data-full-artists")?.trim() ||
      row.querySelector?.(".artist-list")?.textContent?.trim().replace(/\s*\/\s*/g, " / ") ||
      "";
    return {
      id: `netease-${sourceId}`,
      source: row.dataset?.source || "netease",
      sourceId: String(sourceId),
      title,
      artist,
      artists: artist ? artist.split(/\s*\/\s*/).filter(Boolean).map((name) => ({ name, id: "" })) : [],
      src: ""
    };
  }
  if (Number.isInteger(queueIndex) && queueIndex >= 0) return queue[queueIndex] || null;
  return null;
}

export function getTrackActionFromEventTarget(target) {
  const closestRow = () => target?.closest?.("[data-track-row]") || null;
  const artistLink = target?.closest?.(".artist-link");
  if (artistLink) return { type: "artist", artistLink };

  const playerOpen = target?.closest?.("[data-player-open]");
  if (playerOpen) return { type: "player-open", row: playerOpen.closest("[data-track-row]") };

  const moreButton = target?.closest?.("[data-track-more]");
  if (moreButton) {
    return {
      type: "more",
      row: moreButton.closest?.("[data-track-row]") || closestRow(),
      menu: moreButton.parentElement?.querySelector(".track-menu") || null
    };
  }

  for (const type of ["next", "collect", "remove"]) {
    const action = target?.closest?.(`[data-track-action='${type}']`);
    if (action) return { type, row: action.closest?.("[data-track-row]") || closestRow() };
  }

  const playButton = target?.closest?.("[data-track-play]");
  if (playButton) return { type: "play", row: playButton.closest?.("[data-track-row]") || closestRow() };

  return { type: "" };
}
