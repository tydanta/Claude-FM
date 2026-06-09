function hasOpenAIKey(config) {
  return Boolean(config.openaiKey && config.openaiKey !== config.openaiBaseUrl);
}

function contentToText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .filter(Boolean)
    .join("");
}

export function isLikelyGarbledText(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  const length = text.length;
  const cjkCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const questionCount = (text.match(/\?/g) || []).length;
  const replacementCount = (text.match(/[�锟]/g) || []).length;
  const mojibakeCount = (text.match(/[鍐鍦鍙鐨浣鎴涓姝杩闊銆俙]/g) || []).length;
  const noisyPunctuationCount = (text.match(/[?!¡¿§]+/g) || []).join("").length;
  if (replacementCount > 0) return true;
  if (mojibakeCount >= 3 && cjkCount / Math.max(1, length) > 0.08) return true;
  if (length >= 32 && questionCount / length > 0.08 && cjkCount < 4) return true;
  if (length >= 48 && noisyPunctuationCount / length > 0.18 && cjkCount < 4) return true;
  return false;
}

function assertReadableModelText(text, provider = "Model") {
  if (isLikelyGarbledText(text)) {
    throw new Error(`${provider} returned unreadable text`);
  }
  return String(text || "").trim();
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeTextParagraphs(value, { max = 4 } = {}) {
  const parts = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/\n{2,}|(?<=[.!?。！？])\s+(?=[A-Z\u4e00-\u9fff])/)
        .filter(Boolean);
  return parts
    .map((item) => String(item || "").replace(/\s+/g, " ").trim())
    .filter((item) => item && !isLikelyGarbledText(item))
    .slice(0, max);
}

function mockInsight(track, weather, timeBlock) {
  return {
    provider: "mock",
    english: [
      "Some songs do not arrive like answers. They arrive like a room becoming quiet enough for the question to stop performing.",
      `${track.title} feels like a small discipline of attention: not dramatic, not empty, but steady enough to make ordinary time feel chosen.`,
      `In this ${timeBlock} weather, the music becomes less about escape and more about permission: to continue, to pause, and to be unhurried without disappearing.`
    ],
    chinese: [
      "有些歌不是答案，它们更像一个房间终于安静下来，让问题不必再用力表演。",
      `${track.title} 像一种小小的注意力训练：不戏剧化，也不空泛，但足够稳定，让普通时间像是被你主动选择过。`,
      `在这样的${weather.summary}里，音乐不太像逃离，更像一种许可：可以继续，也可以暂停，可以慢下来但不消失。`
    ]
  };
}

function mockChineseInsight(track, weather, timeBlock) {
  return {
    provider: "mock",
    english: [],
    chinese: [
      `${track.title} 像是把房间里的光慢慢调低，让注意力有一个可以落脚的地方。`,
      `现在是${timeBlock}，天气是${weather.summary}，这首歌更适合陪你稳住节奏，而不是催你立刻做出什么答案。`,
      "有时候音乐最好的作用不是解释生活，而是让你在继续往前之前，先轻轻停一下。"
    ]
  };
}

function simplifyTrackForModel(track = {}) {
  return {
    id: track.id || "",
    source: track.source || "",
    title: track.title || "",
    artist: track.artist || "",
    artists: Array.isArray(track.artists)
      ? track.artists.slice(0, 4).map((artist) => ({ id: artist.id || "", name: artist.name || "" }))
      : [],
    album: track.album || "",
    duration: track.duration || 0,
    mood: track.mood || "",
    reason: track.reason || ""
  };
}

function simplifyChatHistory(history = []) {
  return history
    .slice(-6)
    .map((item) => ({
      role: item.role,
      content: String(item.content || "").slice(0, 500)
    }));
}

function normalizeErrorReason(reason) {
  if (!reason) return "";
  if (reason instanceof Error) return reason.message;
  return String(reason);
}

export function createAiService({
  config,
  openAIChatAdapter,
  mimoAdapter,
  fetchImpl = fetch
}) {
  async function askClaudeForDjLine(context) {
    if (!config.anthropicKey) {
      const track = context.track;
      return `现在是${context.timeBlock}，${context.weather.summary} ${context.weather.tempC} 度。下一首是 ${track.title}，我会把节奏放在 ${track.mood}，让你更容易进入状态。`;
    }

    const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: 180,
        system: "你是一个私人电台 DJ。输出一句自然、克制、有陪伴感的中文串场，不要超过 60 字。",
        messages: [
          {
            role: "user",
            content: JSON.stringify(context)
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`Claude failed: ${response.status}`);
    const data = await response.json();
    return assertReadableModelText(contentToText(data.content), "Claude");
  }

  async function askOpenAIForInsight(context) {
    const { track, weather, schedule, preferences, timeBlock, voiceLanguage } = context;
    const chineseOnly = voiceLanguage !== "en";
    if (!hasOpenAIKey(config)) {
      return chineseOnly ? mockChineseInsight(track, weather, timeBlock) : mockInsight(track, weather, timeBlock);
    }

    const systemPrompt = [
      "You are Claudio, a tiny private FM DJ with a calm, thoughtful, slightly playful voice.",
      "Your job is not to review a song like a critic. Your job is to make the listener feel that this track has arrived at the right moment.",
      "Write a short DJ-style music reflection that can be spoken aloud before or during playback.",
      "The reflection must be grounded in the provided track metadata, current time block, weather, schedule, and listener preferences.",
      "If exact lyrics are not provided, do not invent lyrics or quote lyrics.",
      "Avoid generic phrases like 'this song is a journey', 'immersive soundscape', or 'perfect for any mood'.",
      "Use concrete listening details inferred from the metadata: pace, texture, energy, room feeling, cover colors, title imagery, or use case.",
      "The tone should feel intimate, visual, and a little philosophical, but still clear enough for a DJ voiceover.",
      "Structure:",
      "1. Paragraph 1: name the track and capture its immediate mood in one vivid image.",
      "2. Paragraph 2: connect the track to the listener's current moment, weather, time, or task.",
      "3. Paragraph 3: offer a small life observation or emotional interpretation, not a lecture.",
      "4. Optional paragraph 4: a concise DJ handoff line that makes the listener want to keep playing.",
      chineseOnly
        ? "Return strict JSON only. Keys: chinese. chinese must be an array of 3-4 short Chinese paragraphs, each 1-2 sentences. Do not include an english key."
        : "Return strict JSON only. Keys: english and chinese. english must be an array of 3-4 short English paragraphs, each 1-2 sentences. chinese must be an array with the same length, faithful but natural Chinese translations.",
      "Do not use markdown, bullets, numbering, emojis, or quotation marks around the whole JSON."
    ].join(" ");

    const data = await openAIChatAdapter.createChatCompletionRaw({
      model: config.openaiModel,
      temperature: 0.92,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: JSON.stringify({
            promptVersion: config.insightPromptVersion,
            currentTrack: track,
            weather,
            schedule,
            preferences,
            timeBlock,
            voiceLanguage
          })
        }
      ],
      response_format: { type: "json_object" }
    });
    const text = data.choices?.[0]?.message?.content || "";
    const parsed = parseJsonObject(text);
    const chinese = normalizeTextParagraphs(parsed?.chinese, { max: 4 });
    const english = chineseOnly ? [] : normalizeTextParagraphs(parsed?.english, { max: 4 });
    if (!parsed || !chinese.length || (!chineseOnly && !english.length)) {
      return chineseOnly ? mockChineseInsight(track, weather, timeBlock) : mockInsight(track, weather, timeBlock);
    }

    return {
      provider: "openai",
      english,
      chinese: chineseOnly ? chinese : english.map((_, index) => chinese[index] || chinese[chinese.length - 1])
    };
  }

  async function askOpenAIForChat(context) {
    const { message, track, weather, schedule, preferences, history } = context;
    const payload = {
      userMessage: message,
      currentTrack: simplifyTrackForModel(track),
      weather,
      schedule,
      preferences,
      recentConversation: simplifyChatHistory(history)
    };
    const requestPayload = {
      model: config.openaiModel,
      temperature: 0.85,
      messages: [
        {
          role: "system",
          content:
            "You are Claudio, a warm private FM music companion. Reply in concise, natural Chinese. Discuss the current track, mood, listening context, and the user's taste. Do not invent exact lyrics unless provided."
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ]
    };
    return assertReadableModelText(await openAIChatAdapter.createChatCompletion(requestPayload), "DeepSeek");
  }

  async function askClaudeForChat(context) {
    const { message, track, weather } = context;
    if (!config.anthropicKey && hasOpenAIKey(config)) {
      return askOpenAIForChat(context);
    }
    if (!config.anthropicKey) {
      const hints = [
        `我先按本地模式听了一下：${track.title} 的气质更偏 ${track.mood}，适合放在现在这种 ${weather.summary} 的背景里。`,
        "如果你问我这首歌为什么适合现在，我会说它不抢注意力，但能把房间里的节奏托起来。",
        "等模型服务接上后，我就可以结合你的口味记忆、天气和歌单，认真聊这首歌了。"
      ];
      return hints[Math.abs(message.length + track.id.length) % hints.length];
    }

    const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: 360,
        system:
          "You are Claude FM's private music companion. Reply in concise, natural Chinese. Discuss the current track, mood, listening context, and the user's taste. Do not invent exact lyrics unless provided.",
        messages: [
          {
            role: "user",
            content: JSON.stringify({
              userMessage: message,
              currentTrack: track,
              weather: context.weather,
              schedule: context.schedule,
              preferences: context.preferences,
              recentConversation: context.history
            })
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`Claude chat failed: ${response.status}`);
    const data = await response.json();
    return assertReadableModelText(contentToText(data.content), "Claude");
  }

  async function askMimoForChat(context) {
    const { message, track, weather, schedule, preferences, history } = context;
    if (!config.mimoTtsKey || !config.mimoChatEnabled) return null;
    const payload = {
      model: config.mimoChatModel,
      messages: [
        {
          role: "system",
          content: [
            "你是 Claudio，Claude FM 的私人音乐 DJ。请用自然、简洁、有陪伴感的中文回复用户。",
            "你可以聊当前歌曲、天气、情绪、正在听歌的场景和用户偏好。",
            "不要编造具体歌词。不要使用 markdown。不要解释你是模型。",
            "回复控制在 2-4 句，适合直接被朗读。"
          ].join("\n")
        },
        {
          role: "user",
          content: JSON.stringify({
            userMessage: message,
            currentTrack: track,
            weather,
            schedule,
            preferences,
            recentConversation: history
          })
        }
      ]
    };
    const data = await mimoAdapter.chatCompletion(payload, { errorPrefix: "MiMo chat" });
    const choiceMessage = data.choices?.[0]?.message || {};
    const content = assertReadableModelText(choiceMessage.content || "", "MiMo chat");
    return {
      provider: "mimo",
      content,
      voice: null
    };
  }

  function fallbackChatReply(context, reason = "") {
    const { message, track, weather } = context;
    const title = track?.title || "这首歌";
    const mood = track?.mood || "现在的氛围";
    const weatherText = weather?.summary || "此刻";
    const cleanReason = normalizeErrorReason(reason);
    const reasonText = cleanReason ? `（模型暂时没有连上：${cleanReason.slice(0, 80)}）` : "";
    return [
      `${reasonText}我先用本地 DJ 模式陪你聊。`,
      `你刚才说“${message}”，我会把它放在 ${title} 的情绪里听：它现在更像一种 ${mood} 的背景，不急着给答案，只先把注意力稳住。`,
      `在${weatherText}这样的时刻，音乐可以先替我们把话说慢一点。等模型服务恢复后，我再继续给你更完整、更像 Claudio 的回应。`
    ].join("\n\n");
  }

  return {
    askClaudeForDjLine,
    askOpenAIForInsight,
    askClaudeForChat,
    askOpenAIForChat,
    askMimoForChat,
    fallbackChatReply,
    mockInsight,
    mockChineseInsight
  };
}
