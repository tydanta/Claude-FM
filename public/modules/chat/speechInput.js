export function createSpeechInput({
  sttBtn,
  chatInput,
  windowRef = window,
  pauseVoiceForUser = () => {}
}) {
  let speechRecognition = null;
  let isListeningForInput = false;
  let sttBaseText = "";

  function resetButtonState() {
    isListeningForInput = false;
    sttBtn.classList.remove("is-listening");
    sttBtn.setAttribute("aria-pressed", "false");
    sttBtn.title = "语音转文字";
  }

  function initSpeechToText() {
    const SpeechRecognition = windowRef.SpeechRecognition || windowRef.webkitSpeechRecognition;
    if (!sttBtn || !SpeechRecognition) {
      if (sttBtn) {
        sttBtn.disabled = true;
        sttBtn.title = "当前浏览器不支持语音输入";
        sttBtn.setAttribute("aria-label", "语音输入不可用");
      }
      return;
    }

    speechRecognition = new SpeechRecognition();
    speechRecognition.lang = "zh-CN";
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;

    speechRecognition.onstart = () => {
      isListeningForInput = true;
      sttBaseText = chatInput.value.trim();
      pauseVoiceForUser();
      sttBtn.classList.add("is-listening");
      sttBtn.setAttribute("aria-pressed", "true");
      sttBtn.title = "停止语音输入";
    };

    speechRecognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript || "";
        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }
      const spoken = `${finalText}${interimText}`.trim();
      // 保留用户原本输入，再把本轮语音识别文本追加到后面。
      chatInput.value = [sttBaseText, spoken].filter(Boolean).join(sttBaseText && spoken ? " " : "");
      chatInput.focus();
    };

    speechRecognition.onend = resetButtonState;
    speechRecognition.onerror = resetButtonState;

    sttBtn.addEventListener("click", () => {
      if (isListeningForInput) {
        speechRecognition.stop();
        return;
      }
      try {
        speechRecognition.start();
      } catch {
        speechRecognition.stop();
      }
    });
  }

  return {
    initSpeechToText
  };
}
