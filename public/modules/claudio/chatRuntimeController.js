export function createChatRuntimeController({
  elements = {},
  api,
  appendChatMessage,
  resolvePendingChatMessage,
  renderClaudioNotice,
  clearClaudioNotice,
  getFriendlyModelError = (message) => String(message || ""),
  getTrack = () => null,
  getPreferences = () => ({}),
  getVoiceSettings = () => ({}),
  getLocation = () => null,
  setAppPage = () => {}
} = {}) {
  const { chatInput } = elements;

  function markPendingMessage(message) {
    if (!message) return message;
    message.classList?.add("is-thinking");
    message.setAttribute?.("aria-live", "polite");
    return message;
  }

  function appendPendingChatMessage() {
    return markPendingMessage(appendChatMessage?.("assistant", "..."));
  }

  function getChatPayload(text) {
    return {
      message: text,
      track: getTrack() || null,
      preferences: getPreferences() || {},
      voiceSettings: getVoiceSettings() || {},
      location: getLocation()
    };
  }

  function restoreInput(text) {
    if (!chatInput) return;
    chatInput.value = text;
    chatInput.focus?.();
  }

  async function sendChatMessage(text) {
    const messageText = String(text || "").trim();
    if (!messageText) return null;

    appendChatMessage?.("user", messageText);
    const pendingMessage = appendPendingChatMessage();

    try {
      const data = await api("/api/chat", {
        method: "POST",
        timeoutMs: 35000,
        body: JSON.stringify(getChatPayload(messageText))
      });
      if (data.replyError) {
        renderClaudioNotice?.(getFriendlyModelError(data.replyError), {
          key: "chat-error",
          actionLabel: "打开设置",
          action: () => setAppPage("settings")
        });
      } else {
        clearClaudioNotice?.("chat-error");
      }
      const content = data?.message?.content || "";
      return resolvePendingChatMessage?.(pendingMessage, content, data?.voice) || null;
    } catch (error) {
      pendingMessage?.remove?.();
      renderClaudioNotice?.(getFriendlyModelError(error?.message || error), {
        key: "chat-error",
        actionLabel: "重试",
        action: () => restoreInput(messageText)
      });
      return null;
    }
  }

  async function handleChatSubmit(event) {
    event?.preventDefault?.();
    const text = chatInput?.value?.trim() || "";
    if (!text) return null;
    if (chatInput) chatInput.value = "";
    return sendChatMessage(text);
  }

  return {
    appendPendingChatMessage,
    getChatPayload,
    handleChatSubmit,
    restoreInput,
    sendChatMessage
  };
}
