export async function playAudioWithDiagnostics(audio, {
  logger = console,
  renderNotice = () => {},
  context = {},
  notice = "系统拦截了自动播放，请再点一次播放按钮。"
} = {}) {
  try {
    return await audio.play();
  } catch (error) {
    logger?.error?.("[ClaudeFM] audio.play failed", {
      name: error?.name || "",
      message: error?.message || String(error || ""),
      sourceId: context.sourceId || "",
      title: context.title || "",
      src: audio?.currentSrc || audio?.src || context.src || ""
    });
    renderNotice?.(notice, { key: "audio-play-error" });
    throw error;
  }
}
