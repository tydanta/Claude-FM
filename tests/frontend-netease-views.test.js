import assert from "node:assert/strict";
import { renderArtistAlbums, renderArtistPager, selectArtistHeroImage } from "../public/modules/netease/artistView.js";
import { renderCollectPlaylistCards } from "../public/modules/netease/collectModal.js";
import { getPlaylistCoverStyle, getPlaylistDescription, renderPlaylistCards } from "../public/modules/netease/playlistView.js";
import { getRecommendPanelState } from "../public/modules/netease/recommendView.js";
import { renderSearchPreviewItems, getSearchPageTitle, getSearchPageCount } from "../public/modules/netease/searchView.js";

const coverUrl = (url, target) => `/cover?target=${target}&url=${encodeURIComponent(url)}`;

{
  const playlist = { source: "netease", trackCount: 3, tracks: [{ cover: "a" }, { cover: "b" }] };
  assert.equal(getPlaylistDescription(playlist), "共 3 首歌，来自网易云音乐。");
  assert.match(getPlaylistCoverStyle(playlist.tracks, coverUrl), /background-image/);
  assert.match(renderPlaylistCards([{ id: "p1", title: "<歌单>", subtitle: "sub", tracks: [], trackCount: 0 }], coverUrl), /&lt;歌单&gt;/);
}

{
  const html = renderSearchPreviewItems([{ title: "<Song>", artist: "A", sourceId: "1" }]);
  assert.match(html, /data-search-source-id="1"/);
  assert.match(html, /&lt;Song&gt;/);
  assert.equal(getSearchPageTitle("abc"), "搜索「abc」");
  assert.equal(getSearchPageCount(20, true), "20 首，继续滑动加载");
}

{
  assert.match(renderArtistPager(1, 3, "songs"), /data-artist-page="songs"/);
  assert.equal(renderArtistPager(1, 1, "songs"), "");
  assert.equal(selectArtistHeroImage({ avatar: "avatar" }, [{ cover: "song-cover" }]), "avatar");
  assert.match(renderArtistAlbums([{ name: "<Album>", picUrl: "pic", publishTime: new Date("2020-01-01").getTime() }], coverUrl), /2020/);
}

{
  assert.match(renderCollectPlaylistCards([{ sourceId: "p1", title: "<List>", tracks: [{ cover: "a" }] }], coverUrl), /data-collect-playlist-id="p1"/);
}

{
  assert.deepEqual(getRecommendPanelState({ type: "claude" }), {
    kicker: "Claudio",
    title: "Claude 私人推荐",
    historyButtonHidden: true,
    historyButtonText: "历史推荐",
    emptyText: "Claude 私人推荐稍后上线。",
    songs: []
  });
  assert.equal(getRecommendPanelState({ type: "history", loading: true }).emptyText, "正在读取昨天的历史推荐...");
}

console.log("frontend-netease-views tests passed");
