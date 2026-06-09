import assert from "node:assert/strict";
import {
  getTrackActionFromEventTarget,
  getPlainArtistText,
  getTrackFromElement,
  renderArtistLinks,
  renderTrackRow
} from "../public/modules/ui/trackRows.js";

const track = {
  id: "local-1",
  source: "netease",
  sourceId: "song-1",
  title: "Song <One>",
  artist: "A / B",
  artistId: 7,
  cover: "https://p1.music.126.net/cover.jpg"
};

{
  const html = renderTrackRow(track, 0, {
    queueIndex: 4,
    currentTrackId: "local-1",
    actionLabel: "播放",
    allowRemove: true
  });
  assert.match(html, /mine-track-item is-current/);
  assert.match(html, /data-mine-track-index="4"/);
  assert.match(html, /data-source="netease"/);
  assert.match(html, /data-source-id="song-1"/);
  assert.match(html, /Song &lt;One&gt;/);
  assert.match(html, /data-track-action="remove"/);
  assert.match(html, /\/api\/media\/cover\?/);
}

{
  const html = renderTrackRow(track, 0, {
    queueIndex: 4,
    actionButtons: ["next", "collect", "remove"]
  });
  assert.match(html, /track-action-btn/);
  assert.match(html, /\/icons\/nextplay\.svg/);
  assert.match(html, /\/icons\/favorite\.svg/);
  assert.match(html, /\/icons\/cancel\.svg/);
  assert.match(html, /data-track-action="next"/);
  assert.match(html, /data-track-action="collect"/);
  assert.match(html, /data-track-action="remove"/);
  assert.doesNotMatch(html, /data-track-more/);
}

{
  const html = renderTrackRow(track, 0, {
    queueIndex: -1,
    actionButtons: ["next", "collect"]
  });
  assert.match(html, /\/icons\/nextplay\.svg/);
  assert.match(html, /\/icons\/favorite\.svg/);
  assert.doesNotMatch(html, /\/icons\/cancel\.svg/);
  assert.doesNotMatch(html, /data-track-more/);
}

{
  const links = renderArtistLinks(track);
  assert.match(links, /data-artist-id="7"/);
  assert.match(links, /data-artist-name="A"/);
  assert.match(links, /artist-separator/);
  assert.equal(getPlainArtistText(track), "A / B");
  assert.equal(getPlainArtistText({}), "未知歌手");
}

{
  const row = { __track: track, dataset: {} };
  assert.equal(getTrackFromElement(row, {}).id, "local-1");
}

{
  const row = { dataset: { sourceId: "song-2", mineTrackIndex: "" } };
  const resolved = getTrackFromElement(row, {
    trackGroups: [
      [{ id: "a", sourceId: "song-1" }],
      [{ id: "b", sourceId: "song-2" }]
    ],
    queue: [{ id: "queue" }]
  });
  assert.equal(resolved.id, "b");
}

{
  const row = { dataset: { sourceId: "2032142315", mineTrackIndex: "-1" } };
  const resolved = getTrackFromElement(row, {
    trackGroups: [
      [{ id: "netease-a", sourceId: 2032142315 }]
    ],
    queue: []
  });
  assert.equal(resolved.id, "netease-a");
}

{
  const row = {
    dataset: { source: "netease", sourceId: "2032142315", mineTrackIndex: "-1" },
    querySelector(selector) {
      if (selector === ".mine-track-copy strong") return { textContent: "LALA" };
      if (selector === ".artist-list") {
        return {
          getAttribute(name) {
            return name === "data-full-artists" ? "Myke Towers" : "";
          },
          textContent: "Myke Towers"
        };
      }
      return null;
    }
  };
  const resolved = getTrackFromElement(row, { trackGroups: [], queue: [] });
  assert.deepEqual(
    {
      id: resolved.id,
      source: resolved.source,
      sourceId: resolved.sourceId,
      title: resolved.title,
      artist: resolved.artist
    },
    {
      id: "netease-2032142315",
      source: "netease",
      sourceId: "2032142315",
      title: "LALA",
      artist: "Myke Towers"
    }
  );
}

{
  const row = { dataset: { mineTrackIndex: "1" } };
  assert.equal(getTrackFromElement(row, { queue: [{ id: "a" }, { id: "b" }] }).id, "b");
}

{
  const row = { dataset: {} };
  const menu = { hidden: true };
  const target = {
    closest(selector) {
      if (selector === "[data-track-row]") return row;
      if (selector === "[data-track-more]") return { parentElement: { querySelector: () => menu } };
      return null;
    }
  };
  assert.deepEqual(getTrackActionFromEventTarget(target), { type: "more", row, menu });
}

{
  const row = { dataset: {} };
  const target = {
    closest(selector) {
      if (selector === "[data-track-row]") return row;
      if (selector === "[data-track-action='collect']") return {};
      return null;
    }
  };
  assert.deepEqual(getTrackActionFromEventTarget(target), { type: "collect", row });
}

console.log("frontend-track-rows tests passed");
