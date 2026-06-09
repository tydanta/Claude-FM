export function registerHealthRoutes(router, {
  config,
  getIntegrations,
  getCacheStats,
  sendJson,
  now = () => new Date()
}) {
  router.get("/api/health", async ({ res }) => {
    sendJson(res, 200, {
      ok: true,
      service: "claude-fm",
      version: "0.1.0",
      time: now().toISOString(),
      cacheDir: config.cacheDir,
      integrations: getIntegrations()
    });
  });

  router.get("/api/capabilities", async ({ res }) => {
    sendJson(res, 200, {
      ok: true,
      service: "claude-fm",
      mode: "capability-server",
      integrations: getIntegrations(),
      models: {
        insight: {
          provider: "openai-compatible",
          baseUrl: config.openaiBaseUrl,
          chatPath: config.openaiChatPath,
          model: config.openaiModel,
          promptVersion: config.insightPromptVersion,
          enabled: Boolean(config.openaiKey && config.openaiKey !== config.openaiBaseUrl)
        },
        chat: {
          provider: config.mimoTtsKey && config.mimoChatEnabled ? "mimo" : (config.anthropicKey ? "claude" : "openai-compatible"),
          model: config.mimoTtsKey && config.mimoChatEnabled ? config.mimoChatModel : (config.anthropicKey ? config.anthropicModel : config.openaiModel),
          enabled: Boolean((config.mimoTtsKey && config.mimoChatEnabled) || config.anthropicKey || (config.openaiKey && config.openaiKey !== config.openaiBaseUrl))
        },
        voice: {
          provider: config.mimoTtsKey ? "mimo" : (config.piperEnabled ? "piper" : "fish-or-browser"),
          enabled: Boolean(config.mimoTtsKey || config.piperEnabled || (config.fishAudioKey && config.fishAudioReferenceId)),
          voice: config.mimoTtsKey ? config.mimoTtsVoice : (config.piperEnabled ? config.piperVoice : config.fishAudioReferenceId),
          model: config.mimoTtsKey ? config.mimoTtsModel : undefined
        }
      },
      cache: await getCacheStats(),
      ttlHours: {
        insight: config.insightCacheTtlHours,
        voice: config.voiceCacheTtlHours
      }
    });
  });
}
