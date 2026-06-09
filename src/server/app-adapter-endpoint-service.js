export function createAppAdapterEndpointService({
  config,
  neteaseAdapter
}) {
  function getOpenAIChatUrl() {
    const chatPath = config.openaiChatPath.startsWith("/") ? config.openaiChatPath : `/${config.openaiChatPath}`;
    return `${config.openaiBaseUrl}${chatPath}`;
  }

  async function neteaseRequest(pathname, params = {}, { method = "GET", auth = false, rawBody = null } = {}) {
    return neteaseAdapter.request(pathname, params, { method, auth, rawBody });
  }

  return {
    getOpenAIChatUrl,
    neteaseRequest
  };
}
