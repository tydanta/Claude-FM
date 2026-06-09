export function getRecommendPanelState({ type = "daily", songs = [], loading = false } = {}) {
  if (type === "claude") {
    return {
      kicker: "Claudio",
      title: "Claude 私人推荐",
      historyButtonHidden: true,
      historyButtonText: "历史推荐",
      emptyText: "Claude 私人推荐稍后上线。",
      songs: []
    };
  }
  const history = type === "history";
  let emptyText = "";
  if (loading) {
    emptyText = history ? "正在读取昨天的历史推荐..." : "正在读取今天的每日推荐...";
  } else if (!songs.length) {
    emptyText = history ? "昨天的每日推荐还没有本地记录。" : "还没有读取到每日推荐。";
  }
  return {
    kicker: "网易云",
    title: history ? "历史推荐" : "每日推荐",
    historyButtonHidden: false,
    historyButtonText: history ? "今日推荐" : "历史推荐",
    emptyText,
    songs
  };
}
