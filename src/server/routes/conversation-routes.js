export function registerConversationRoutes(router, {
  config,
  state,
  getCurrentTrack,
  normalizeWeatherLocation,
  getWeather,
  getSchedule,
  getTrackById,
  askClaudeForChat,
  fallbackChatReply,
  synthesizeVoice,
  parseBody,
  warn = console.warn,
  now = () => new Date().toISOString(),
  sendJson
}) {
  router.post("/api/chat", async ({ req, res }) => {
    const body = await parseBody(req);
    const message = String(body.message || "").trim();
    if (!message) {
      sendJson(res, 400, { error: "Message is required" });
      return;
    }

    const weather = await getWeather(normalizeWeatherLocation(body.location));
    const schedule = await getSchedule();
    const track = body.track?.id ? getTrackById(body.track.id) : getCurrentTrack();
    const trackContext = body.track && typeof body.track === "object"
      ? { ...track, ...body.track }
      : track;
    const history = state.messages.filter((item) => item.role !== "system").slice(-8);
    const chatContext = {
      message,
      track: trackContext,
      weather,
      schedule,
      preferences: { ...state.preferences, ...(body.preferences || {}) },
      history,
      voiceSettings: body.voiceSettings || {}
    };
    let reply;
    let voice = null;
    let provider = config.anthropicKey ? "claude" : (config.openaiKey ? "openai" : "mock");
    let replyError = null;
    try {
      reply = await askClaudeForChat(chatContext);
      if (reply && config.mimoTtsKey) {
        // 文本回复优先返回；语音预热放后台做，避免 TTS 抖动拖慢聊天体验。
        synthesizeVoice(reply, chatContext.voiceSettings).catch((voiceError) => {
          warn("MiMo chat voice warmup failed:", voiceError instanceof Error ? voiceError.message : String(voiceError));
        });
      }
    } catch (error) {
      replyError = error instanceof Error ? error.message : String(error);
      provider = "local-fallback";
      reply = fallbackChatReply(chatContext, replyError);
    }

    const userMessage = { role: "user", content: message, at: now() };
    const assistantMessage = { role: "assistant", content: reply, at: now() };
    state.messages.push(userMessage, assistantMessage);
    state.messages = [state.messages[0], ...state.messages.slice(-24)];

    sendJson(res, 200, {
      ok: true,
      provider,
      replyError,
      track: trackContext,
      message: assistantMessage,
      voice,
      history: state.messages.filter((item) => item.role !== "system")
    });
  });

  router.post("/api/voice", async ({ req, res }) => {
    const body = await parseBody(req);
    const track = getCurrentTrack();
    const text = String(body.text || `Next is ${track.title}. ${track.reason || ""}`).trim();
    const requireAudio = body.requireAudio !== false;
    let result;
    try {
      result = await synthesizeVoice(text, body.voiceSettings || {});
    } catch (error) {
      if (requireAudio) {
        sendJson(res, 503, {
          ok: false,
          provider: "none",
          text,
          audioUrl: null,
          mimeType: null,
          reason: error instanceof Error ? error.message : String(error)
        });
        return;
      }
      result = {
        provider: "browser",
        text,
        audioUrl: null,
        mimeType: null,
        reason: error instanceof Error ? error.message : String(error)
      };
    }
    if (requireAudio && !result.audioUrl) {
      sendJson(res, 503, {
        ok: false,
        ...result
      });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      ...result
    });
  });
}
