export function createRouter() {
  const routes = new Map();
  const prefixRoutes = [];

  function add(method, pathname, handler) {
    routes.set(`${String(method || "GET").toUpperCase()} ${pathname}`, handler);
    return api;
  }

  function addPrefix(method, prefix, handler) {
    prefixRoutes.push({
      method: String(method || "GET").toUpperCase(),
      prefix,
      handler
    });
    // 先注册的精确路由优先，前缀路由按长路径优先，避免 /api/a/ 抢走 /api/a/b/。
    prefixRoutes.sort((a, b) => b.prefix.length - a.prefix.length);
    return api;
  }

  async function handle(context) {
    const method = String(context.req.method || "GET").toUpperCase();
    const key = `${method} ${context.url.pathname}`;
    const handler = routes.get(key);
    if (handler) {
      await handler(context);
      return true;
    }

    const prefixRoute = prefixRoutes.find((route) =>
      route.method === method && context.url.pathname.startsWith(route.prefix)
    );
    if (!prefixRoute) return false;

    await prefixRoute.handler({
      ...context,
      pathTail: context.url.pathname.slice(prefixRoute.prefix.length)
    });
    return true;
  }

  const api = {
    add,
    addPrefix,
    get: (pathname, handler) => add("GET", pathname, handler),
    post: (pathname, handler) => add("POST", pathname, handler),
    getPrefix: (prefix, handler) => addPrefix("GET", prefix, handler),
    postPrefix: (prefix, handler) => addPrefix("POST", prefix, handler),
    handle
  };
  return api;
}
