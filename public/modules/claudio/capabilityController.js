export function createCapabilityController({
  statusEls = {},
  djOnlineDot,
  capabilityLine,
  capabilityModel,
  capabilityCache,
  capabilityTtl,
  remoteCapabilityBaseUrl = "",
  fetchWithTimeout = fetch,
  getRemoteProxyUrl = (path) => path,
  formatBytes = (bytes) => `${bytes}`,
  documentRef = document
} = {}) {
  function renderCapabilityDetails(data) {
    if (!capabilityModel || !capabilityCache || !capabilityTtl) return;
    if (data === false) {
      capabilityModel.textContent = "offline";
      capabilityCache.textContent = "--";
      capabilityTtl.textContent = "--";
      return;
    }
    if (!data) {
      capabilityModel.textContent = "local";
      capabilityCache.textContent = "--";
      capabilityTtl.textContent = "--";
      return;
    }

    const insightFiles = data.cache?.insight?.files || 0;
    const voiceFiles = data.cache?.voice?.files || 0;
    const cacheBytes = (data.cache?.insight?.bytes || 0) + (data.cache?.voice?.bytes || 0);
    const modelName = data.models?.insight?.model || "unknown";
    capabilityModel.textContent = modelName;
    capabilityCache.textContent = `${insightFiles}/${voiceFiles} 项 ${formatBytes(cacheBytes)}`;
    capabilityTtl.textContent = `${data.ttlHours?.insight || "--"}h / ${data.ttlHours?.voice || "--"}h`;
  }

  function renderIntegrations(integrations = {}) {
    if (remoteCapabilityBaseUrl) return;
    if (!statusEls.insight || !statusEls.chat || !statusEls.voice || !statusEls.cache) return;
    statusEls.insight.textContent = integrations.openai ? "local" : "mock";
    statusEls.chat.textContent = integrations.claude || integrations.openai ? "local" : "mock";
    statusEls.voice.textContent = integrations.fishAudio ? "local" : "browser";
    statusEls.cache.textContent = "--";
    renderCapabilityDetails(null);
  }

  function setDjOnline() {
    if (!djOnlineDot) return;
    djOnlineDot.classList.toggle("is-online", true);
    djOnlineDot.classList.toggle("is-offline", false);
    const label = "DJ 在线";
    djOnlineDot.setAttribute("aria-label", label);
    djOnlineDot.setAttribute("title", label);
  }

  async function refreshCapabilities() {
    if (!capabilityLine) return;
    documentRef.body.dataset.capabilityRefresh = "started";
    if (!remoteCapabilityBaseUrl) {
      capabilityLine.querySelector("strong").textContent = "local only";
      renderCapabilityDetails(null);
      documentRef.body.dataset.capabilityRefresh = "local";
      setDjOnline(true);
      return;
    }

    try {
      capabilityLine.querySelector("span").textContent = "Capability server";
      capabilityLine.querySelector("strong").textContent = "checking";
      const response = await fetchWithTimeout(getRemoteProxyUrl("/api/capabilities"), {
        headers: { "content-type": "application/json" }
      });
      if (!response.ok) throw new Error(`capabilities ${response.status}`);
      const data = await response.json();
      const cacheBytes = (data.cache?.insight?.bytes || 0) + (data.cache?.voice?.bytes || 0);
      if (statusEls.insight && statusEls.chat && statusEls.voice && statusEls.cache) {
        statusEls.insight.textContent = data.models?.insight?.enabled ? data.models.insight.model : "off";
        statusEls.chat.textContent = data.models?.chat?.enabled ? data.models.chat.model : "off";
        statusEls.voice.textContent = data.models?.voice?.enabled ? data.models.voice.provider : "off";
        statusEls.cache.textContent = formatBytes(cacheBytes);
      }
      capabilityLine.querySelector("span").textContent = "Capability server";
      capabilityLine.querySelector("strong").textContent = new URL(remoteCapabilityBaseUrl).host;
      renderCapabilityDetails(data);
      documentRef.body.dataset.capabilityRefresh = "ok";
      setDjOnline(true);
    } catch (error) {
      if (statusEls.insight && statusEls.chat && statusEls.voice && statusEls.cache) {
        statusEls.insight.textContent = "offline";
        statusEls.chat.textContent = "offline";
        statusEls.voice.textContent = "offline";
        statusEls.cache.textContent = "--";
      }
      capabilityLine.querySelector("span").textContent = "Capability server";
      capabilityLine.querySelector("strong").textContent = "offline";
      renderCapabilityDetails(false);
      documentRef.body.dataset.capabilityRefresh = "error";
      // 远程能力服务器离线不等于本地 DJ 不可用，状态点保持在线避免误导用户。
      setDjOnline(true);
    }
  }

  return {
    refreshCapabilities,
    renderCapabilityDetails,
    renderIntegrations,
    setDjOnline
  };
}
