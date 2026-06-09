export function createOpenAIChatAdapter({
  getUrl,
  getApiKey,
  fetchImpl = fetch,
  retryDelayMs = 450
}) {
  async function requestWithRetry(payload, { timeouts = [18000, 26000], validate = null } = {}) {
    const body = JSON.stringify(payload);
    let lastError = null;
    for (let attempt = 0; attempt < timeouts.length; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeouts[attempt]);
      try {
        const response = await fetchImpl(getUrl(), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${getApiKey()}`
          },
          body,
          signal: controller.signal
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(`OpenAI-compatible chat failed: ${response.status} ${detail}`.trim());
        }
        const data = await response.json();
        return validate ? validate(data) : data;
      } catch (error) {
        lastError = error;
        if (!/abort|timeout|network|fetch|empty/i.test(String(error?.message || error))) break;
        if (attempt < timeouts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError || new Error("OpenAI-compatible chat failed");
  }

  async function createChatCompletionRaw(payload, options = {}) {
    return requestWithRetry(payload, options);
  }

  async function createChatCompletion(payload, options = {}) {
    return requestWithRetry(payload, {
      ...options,
      validate(data) {
        const content = String(data.choices?.[0]?.message?.content || "").trim();
        if (!content) throw new Error("OpenAI-compatible chat returned empty content");
        return content;
      }
    });
  }

  return { createChatCompletion, createChatCompletionRaw };
}
