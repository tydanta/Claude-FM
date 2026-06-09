import assert from "node:assert/strict";
import { createAiService } from "../src/server/ai-service.js";

const baseContext = {
  message: "聊聊这首歌",
  track: {
    id: "track-1",
    source: "netease",
    title: "Quiet Room",
    artist: "Danta",
    artists: [{ id: "artist-1", name: "Danta" }],
    album: "Night Notes",
    duration: 188,
    mood: "calm",
    reason: "soft focus"
  },
  weather: { summary: "小雨", tempC: 21 },
  schedule: [{ time: "21:30", title: "复盘", energy: "downshift" }],
  preferences: { night: "低能量" },
  timeBlock: "night",
  history: [{ role: "user", content: "上一句" }]
};

function createService(overrides = {}) {
  const rawCalls = [];
  const chatCalls = [];
  const mimoCalls = [];
  const anthropicCalls = [];
  const config = {
    anthropicKey: "",
    anthropicModel: "claude-test",
    openaiKey: "",
    openaiBaseUrl: "https://api.example.test",
    openaiModel: "openai-test",
    insightPromptVersion: "test-v1",
    mimoTtsKey: "",
    mimoChatEnabled: false,
    mimoChatModel: "mimo-chat",
    ...overrides.config
  };
  const openAIChatAdapter = {
    async createChatCompletionRaw(payload) {
      rawCalls.push(payload);
      return overrides.rawResponse || {
        choices: [{
          message: {
            content: JSON.stringify({
              english: ["A calm pulse."],
              chinese: ["一种安静的脉冲。"]
            })
          }
        }]
      };
    },
    async createChatCompletion(payload) {
      chatCalls.push(payload);
      return overrides.chatResponse || "openai chat reply";
    }
  };
  const mimoAdapter = {
    async chatCompletion(payload, options) {
      mimoCalls.push({ payload, options });
      return overrides.mimoResponse || {
        choices: [{ message: { content: "mimo chat reply" } }]
      };
    }
  };
  const fetchImpl = async (url, options) => {
    anthropicCalls.push({ url, options });
    return overrides.anthropicResponse || {
      ok: true,
      async json() {
        return { content: [{ text: "claude reply" }] };
      }
    };
  };
  const service = createAiService({
    config,
    openAIChatAdapter,
    mimoAdapter,
    fetchImpl
  });
  return { service, rawCalls, chatCalls, mimoCalls, anthropicCalls };
}

{
  const { service, rawCalls } = createService({
    config: { openaiKey: "", openaiBaseUrl: "https://api.example.test" }
  });
  const insight = await service.askOpenAIForInsight({ ...baseContext, voiceLanguage: "zh" });
  assert.equal(insight.provider, "mock");
  assert.deepEqual(insight.english, []);
  assert.equal(insight.chinese.length, 3);
  assert.equal(rawCalls.length, 0);
}

{
  const { service, rawCalls } = createService({
    config: { openaiKey: "ok", openaiBaseUrl: "https://api.example.test" }
  });
  const insight = await service.askOpenAIForInsight({ ...baseContext, voiceLanguage: "en" });
  assert.equal(insight.provider, "openai");
  assert.equal(rawCalls.length, 1);
  const userPayload = JSON.parse(rawCalls[0].messages.find((message) => message.role === "user").content);
  assert.deepEqual(userPayload.currentTrack, baseContext.track);
  assert.deepEqual(userPayload.weather, baseContext.weather);
  assert.deepEqual(userPayload.preferences, baseContext.preferences);
  assert.equal(userPayload.timeBlock, "night");
}

{
  const { service } = createService();
  const reply = service.fallbackChatReply(baseContext, "quota exhausted");
  assert.match(reply, /quota exhausted/);
  assert.match(reply, /本地 DJ 模式/);
  assert.doesNotMatch(reply, /姝岃瘝|lyrics|鍞卞埌|鍐欓亾/i);
}

{
  const { service } = createService({
    config: { mimoTtsKey: "mk", mimoChatEnabled: false }
  });
  const reply = await service.askMimoForChat(baseContext);
  assert.equal(reply, null);
}

{
  const { service } = createService({
    config: { anthropicKey: "", openaiKey: "", openaiBaseUrl: "https://api.example.test" }
  });
  const reply = await service.askClaudeForChat(baseContext);
  assert.match(reply, /Quiet Room/);
}

{
  const { service } = createService({
    config: { anthropicKey: "", openaiKey: "ok", openaiBaseUrl: "https://api.example.test" },
    chatResponse: "??D?!should????:NoNoD:??? ThisJ§NOHost房????(SOh!?!?No?NoNoNo?!nNo"
  });
  await assert.rejects(
    () => service.askOpenAIForChat(baseContext),
    /unreadable text/
  );
}

console.log("ai-service tests passed");
