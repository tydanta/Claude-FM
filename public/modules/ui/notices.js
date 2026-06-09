import { escapeHtml } from "./formatting.js";

export function createClaudioNotices({ chatLog, documentRef = document }) {
  function renderClaudioNotice(message, { actionLabel = "", action = null, key = "notice" } = {}) {
    // 同一个 key 只保留一条提示，避免联网/登录状态变化时堆叠重复气泡。
    const existing = chatLog.querySelector(`[data-notice-key="${key}"]`);
    if (existing) existing.remove();
    const item = documentRef.createElement("div");
    item.className = "claudio-notice";
    item.dataset.noticeKey = key;
    item.innerHTML = `
      <span class="claudio-avatar tiny" aria-hidden="true"><i></i><b></b><em></em></span>
      <b>
        <span>${escapeHtml(message)}</span>
        ${actionLabel ? `<button type="button" class="notice-action">${escapeHtml(actionLabel)}</button>` : ""}
      </b>
    `;
    if (actionLabel && action) {
      item.querySelector(".notice-action").addEventListener("click", action);
    }
    chatLog.append(item);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function clearClaudioNotice(key) {
    chatLog.querySelector(`[data-notice-key="${key}"]`)?.remove();
  }

  return {
    renderClaudioNotice,
    clearClaudioNotice
  };
}
