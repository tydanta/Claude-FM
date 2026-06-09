import { escapeHtml } from "../ui/formatting.js";

export function renderUserMessageHtml(content) {
  return `<b>${escapeHtml(content)}</b>`;
}

export function renderAssistantMessageHtml(content) {
  return `<span class="claudio-avatar tiny" aria-hidden="true"><i></i><b></b><em></em></span><b>${escapeHtml(content)}</b>`;
}

export function getChatMessageDataset(content, voice = null) {
  const dataset = { speakText: content };
  if (voice?.audioUrl) {
    dataset.voiceUrl = voice.audioUrl;
    dataset.voiceMime = voice.mimeType || "";
  }
  return dataset;
}

export function createChatController({ chatLog }) {
  function appendChatMessage(role, content, options = {}) {
    const item = document.createElement("div");
    if (role === "user") {
      item.className = "from-user";
      item.innerHTML = renderUserMessageHtml(content);
    } else {
      item.className = "claudio-message chat-message";
      const dataset = getChatMessageDataset(content, options.voice);
      item.dataset.speakText = dataset.speakText;
      if (dataset.voiceUrl) {
        item.dataset.voiceUrl = dataset.voiceUrl;
        item.dataset.voiceMime = dataset.voiceMime;
      }
      item.innerHTML = renderAssistantMessageHtml(content);
    }
    chatLog.append(item);
    chatLog.scrollTop = chatLog.scrollHeight;
    return item;
  }

  function resolvePendingChatMessage(item, content, voice = null) {
    if (!item) return appendChatMessage("assistant", content);
    const wasThinking = item.classList.contains("is-thinking");
    item.classList.remove("is-thinking");
    item.removeAttribute("aria-live");
    item.dataset.speakText = content;
    if (voice?.audioUrl) {
      item.dataset.voiceUrl = voice.audioUrl;
      item.dataset.voiceMime = voice.mimeType || "";
    } else {
      delete item.dataset.voiceUrl;
      delete item.dataset.voiceMime;
    }
    const bubble = item.querySelector("b");
    if (wasThinking) {
      item.innerHTML = renderAssistantMessageHtml(content);
    } else if (bubble) {
      bubble.textContent = content;
    }
    chatLog.scrollTop = chatLog.scrollHeight;
    return item;
  }

  return {
    appendChatMessage,
    resolvePendingChatMessage
  };
}
