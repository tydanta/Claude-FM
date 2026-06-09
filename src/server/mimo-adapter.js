export function createMimoAdapter({
  config,
  fetchImpl = fetch,
  platform = process.platform,
  fallback = null
}) {
  async function chatCompletion(payload, { errorPrefix = "MiMo chat" } = {}) {
    try {
      const response = await fetchImpl(`${config.mimoTtsBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "api-key": config.mimoTtsKey
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`${errorPrefix} failed: ${response.status} ${detail}`.trim());
      }

      return response.json();
    } catch (error) {
      if (platform !== "win32" || typeof fallback !== "function") throw error;
      // Windows 上部分环境的 fetch/TLS 会不稳定，保留 PowerShell fallback 作为最后兜底。
      return fallback(payload);
    }
  }

  return { chatCompletion };
}
