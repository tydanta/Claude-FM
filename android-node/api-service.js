const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

function parseEnvFileContent(content) {
  const parsed = {};
  String(content || "").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const separator = trimmed.indexOf("=");
    if (separator === -1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    parsed[key] = value;
  });
  return parsed;
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function writeJsonFile(filePath, value) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
  } catch {
    // Android asset folders can be read-only on some devices; the in-memory
    // settings still apply until the app process exits.
  }
}

function readBundledEnv(rootDir, moduleDir) {
  const candidates = [
    path.join(rootDir, "claudio-runtime.env"),
    path.join(rootDir, ".env"),
    path.join(moduleDir || "", "claudio-runtime.env"),
    path.join(moduleDir || "", ".env"),
    path.join(rootDir, "node_modules", "claude-private-fm", ".env")
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return parseEnvFileContent(fs.readFileSync(candidate, "utf8"));
    } catch {
      // Try the next candidate.
    }
  }
  return {};
}

function normalizeBaseUrl(value, fallback) {
  return String(value || fallback || "").trim().replace(/\/$/, "");
}

function getSettingsPath(settingsPath = "") {
  return settingsPath || path.join(process.cwd(), "claudio-android-runtime-settings.json");
}

function createRuntimeConfig(rootDir = process.cwd(), settingsPath = "", moduleDir = __dirname) {
  const env = {
    ...readBundledEnv(rootDir, moduleDir),
    ...process.env
  };
  const saved = readJsonFile(getSettingsPath(settingsPath));
  const openaiBaseUrl = normalizeBaseUrl(saved.openaiBaseUrl || env.OPENAI_BASE_URL, "https://api.bjxrouter.com");
  return {
    openaiBaseUrl,
    openaiKey: String(saved.openaiKey || env.OPENAI_API_KEY || ""),
    openaiModel: String(saved.openaiModel || env.OPENAI_MODEL || "deepseek-chat"),
    openaiChatPath: String(saved.openaiChatPath || env.OPENAI_CHAT_PATH || (
      openaiBaseUrl.includes("api.deepseek.com") ? "/chat/completions" : "/v1/chat/completions"
    )),
    mimoTtsKey: String(saved.mimoTtsKey || env.MIMO_TTS_API_KEY || ""),
    mimoTtsBaseUrl: normalizeBaseUrl(saved.mimoTtsBaseUrl || env.MIMO_TTS_BASE_URL, "https://api.xiaomimimo.com/v1"),
    mimoTtsModel: String(saved.mimoTtsModel || env.MIMO_TTS_MODEL || "mimo-v2.5-tts"),
    mimoVoiceDesignModel: String(saved.mimoVoiceDesignModel || env.MIMO_VOICE_DESIGN_MODEL || "mimo-v2.5-tts-voicedesign"),
    mimoTtsVoice: String(saved.mimoTtsVoice || env.MIMO_TTS_VOICE || "冰糖"),
    mimoTtsFormat: String(saved.mimoTtsFormat || env.MIMO_TTS_FORMAT || "wav"),
    mimoTtsStyle: String(saved.mimoTtsStyle || env.MIMO_TTS_STYLE || "Warm, calm private radio DJ voice. Natural, intimate, and gentle."),
    qweatherApiKey: String(saved.qweatherApiKey || env.QWEATHER_API_KEY || env.OPENWEATHER_API_KEY || ""),
    qweatherApiHost: normalizeBaseUrl(saved.qweatherApiHost || env.QWEATHER_API_HOST, "devapi.qweather.com").replace(/^https?:\/\//, ""),
    qweatherLocation: String(saved.qweatherLocation || env.QWEATHER_LOCATION || env.WEATHER_CITY || "101020100"),
    weatherCity: String(saved.weatherCity || env.WEATHER_CITY || "上海")
  };
}

function maskSecret(value) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 8) return "********";
  return `${text.slice(0, 4)}****${text.slice(-4)}`;
}

function editableSettings(config, revealSecrets = false) {
  return {
    openaiBaseUrl: config.openaiBaseUrl,
    openaiKey: revealSecrets ? config.openaiKey : maskSecret(config.openaiKey),
    openaiModel: config.openaiModel,
    mimoTtsKey: revealSecrets ? config.mimoTtsKey : maskSecret(config.mimoTtsKey),
    mimoTtsModel: config.mimoTtsModel,
    mimoVoiceDesignModel: config.mimoVoiceDesignModel,
    qweatherApiKey: revealSecrets ? config.qweatherApiKey : maskSecret(config.qweatherApiKey),
    qweatherApiHost: config.qweatherApiHost,
    qweatherLocation: config.qweatherLocation,
    weatherCity: config.weatherCity
  };
}

function normalizeLocation(value) {
  if (!value || typeof value !== "object") return null;
  const lat = Number(value.lat !== undefined ? value.lat : value.latitude);
  const lon = Number(value.lon !== undefined ? value.lon : (value.lng !== undefined ? value.lng : value.longitude));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return {
    lat: Number(lat.toFixed(5)),
    lon: Number(lon.toFixed(5)),
    qweatherLocation: `${lon.toFixed(2)},${lat.toFixed(2)}`
  };
}

function requestJson(url, { method = "GET", headers = {}, body = "", timeoutMs = 18000 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === "https:" ? https : http;
    const req = client.request(target, { method, headers, timeout: timeoutMs }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        text += chunk;
      });
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }
        if ((res.statusCode || 500) >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 240)}`));
          return;
        }
        resolve(json);
      });
    });
    req.on("timeout", () => {
      req.destroy(new Error("request timeout"));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function fallbackWeather(config, location, provider = "mock") {
  return {
    provider,
    city: location ? "当前位置" : config.weatherCity,
    summary: "多云",
    tempC: 24,
    humidity: 66,
    location: location ? { lat: location.lat, lon: location.lon } : null
  };
}

async function getWeather(config, location = null, request = requestJson) {
  if (!config.qweatherApiKey) return fallbackWeather(config, location);
  try {
    const url = new URL(`https://${config.qweatherApiHost}/v7/weather/now`);
    url.searchParams.set("location", location && location.qweatherLocation ? location.qweatherLocation : config.qweatherLocation);
    url.searchParams.set("lang", "zh");
    const data = await request(url, {
      headers: { "X-QW-Api-Key": config.qweatherApiKey },
      timeoutMs: 10000
    });
    if (!data || data.code !== "200") throw new Error(`QWeather failed: ${data && data.code ? data.code : "unknown"}`);
    const now = data.now || {};
    return {
      provider: "qweather",
      city: location ? "当前位置" : config.weatherCity,
      summary: now.text || "未知",
      tempC: Math.round(Number(now.temp !== undefined ? now.temp : 0)),
      humidity: now.humidity !== undefined ? Number(now.humidity) : null,
      icon: now.icon || "",
      observedAt: now.obsTime || data.updateTime || "",
      location: location ? { lat: location.lat, lon: location.lon } : null
    };
  } catch (error) {
    console.log(`[Claude API] weather fallback: ${error.message || error}`);
    return fallbackWeather(config, location, "qweather-fallback");
  }
}

function getOpenAIChatUrl(config) {
  return `${config.openaiBaseUrl}${config.openaiChatPath}`;
}

function fallbackChatReply(message, track, weather, reason = "") {
  const title = track && track.title ? track.title : "这首歌";
  const mood = track && track.mood ? track.mood : "现在的氛围";
  const weatherText = weather && weather.summary ? weather.summary : "此刻";
  const reasonText = reason ? `（模型暂时没有连上：${String(reason).slice(0, 80)}）` : "";
  return [
    `${reasonText}我先用本地 DJ 模式陪你聊。`,
    `你刚才说“${message}”，我会把它放在 ${title} 的情绪里听：它现在更像一种 ${mood} 的背景，不急着给答案，只先把注意力稳住。`,
    `在${weatherText}这样的时刻，音乐可以先替我们把话说慢一点。等 DeepSeek 恢复后，我再继续给你更完整的回应。`
  ].join("\n\n");
}

function isLikelyGarbledText(value) {
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

function assertReadableModelText(text, provider) {
  if (isLikelyGarbledText(text)) throw new Error(`${provider || "Model"} returned unreadable text`);
  return String(text || "").trim();
}

async function askOpenAI(config, context, request = requestJson) {
  if (!config.openaiKey) throw new Error("DeepSeek API Key is missing");
  const payload = {
    model: config.openaiModel,
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content: "You are Claudio, a warm private FM music companion. Reply in concise, natural Chinese. Discuss the current track, mood, listening context, and the user's taste. Do not invent exact lyrics unless provided."
      },
      {
        role: "user",
        content: JSON.stringify({
          userMessage: context.message,
          currentTrack: context.track,
          weather: context.weather,
          preferences: context.preferences,
          recentConversation: context.history
        })
      }
    ]
  };
  const data = await request(getOpenAIChatUrl(config), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.openaiKey}`
    },
    body: JSON.stringify(payload),
    timeoutMs: 26000
  });
  const firstChoice = data && data.choices && data.choices[0] ? data.choices[0] : null;
  const content = String(firstChoice && firstChoice.message && firstChoice.message.content ? firstChoice.message.content : "").trim();
  if (!content) throw new Error("DeepSeek returned empty content");
  return assertReadableModelText(content, "DeepSeek");
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization"
  });
  res.end(JSON.stringify(payload));
}

function getIntegrations(config) {
  return {
    claude: false,
    openai: Boolean(config.openaiKey),
    qweather: Boolean(config.qweatherApiKey),
    weather: Boolean(config.qweatherApiKey),
    mimo: Boolean(config.mimoTtsKey)
  };
}

function sanitizeVoiceText(text) {
  return String(text || "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function normalizeVoiceSettings(config, settings) {
  const source = settings || {};
  const customPrompt = String(source.customPrompt || "").trim();
  if (customPrompt) {
    return {
      mode: "custom",
      model: config.mimoVoiceDesignModel,
      voice: customPrompt,
      prompt: customPrompt
    };
  }
  return {
    mode: "preset",
    model: config.mimoTtsModel,
    voice: String(source.preset || config.mimoTtsVoice || "冰糖").trim() || "冰糖",
    prompt: ""
  };
}

async function synthesizeMimoVoice(config, text, settings, request) {
  const cleanText = sanitizeVoiceText(text);
  if (!cleanText) throw new Error("Empty voice text");
  if (!config.mimoTtsKey) throw new Error("MiMo TTS API Key is missing");
  const voiceSettings = normalizeVoiceSettings(config, settings);
  const audio = { format: config.mimoTtsFormat };
  if (voiceSettings.mode !== "custom") audio.voice = voiceSettings.voice;
  const payload = {
    model: voiceSettings.model,
    audio,
    messages: [
      {
        role: "user",
        content: voiceSettings.mode === "custom" ? voiceSettings.prompt : config.mimoTtsStyle
      },
      {
        role: "assistant",
        content: cleanText
      }
    ]
  };
  const data = await request(`${config.mimoTtsBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": config.mimoTtsKey
    },
    body: JSON.stringify(payload),
    timeoutMs: 26000
  });
  const audioData = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.audio
    ? data.choices[0].message.audio.data
    : "";
  if (!audioData) throw new Error("MiMo TTS response did not include audio data");
  const mimeType = config.mimoTtsFormat === "mp3" ? "audio/mpeg" : `audio/${config.mimoTtsFormat}`;
  return {
    provider: "mimo",
    text: cleanText,
    audioUrl: `data:${mimeType};base64,${audioData}`,
    mimeType,
    cached: false,
    reason: null
  };
}

function createNowPayload(config, weather) {
  return {
    track: {
      id: "android-local-ready",
      title: "Claude FM",
      artist: "Claudio",
      mood: "private radio",
      src: "",
      cover: "",
      reason: "Android local capability service is ready."
    },
    state: {
      volume: 0.8,
      position: 0,
      preferences: {},
      playback: {}
    },
    weather,
    schedule: [],
    queue: [],
    integrations: getIntegrations(config),
    djLine: ""
  };
}

function createClaudeCapabilityServer({
  port = 3012,
  rootDir = process.cwd(),
  settingsPath = "",
  request = requestJson,
  createServer = (handler) => http.createServer(handler)
} = {}) {
  let config = createRuntimeConfig(rootDir, settingsPath, __dirname);
  const history = [{ role: "system", content: "ready" }];

  async function handler(req, res) {
    if (req.method === "OPTIONS") {
      sendJson(res, 204, {});
      return;
    }
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        sendJson(res, 200, { ok: true, integrations: getIntegrations(config) });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/capabilities") {
        sendJson(res, 200, { ok: true, integrations: getIntegrations(config) });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/settings") {
        sendJson(res, 200, { ok: true, settings: editableSettings(config, url.searchParams.get("reveal") === "1") });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/settings") {
        const body = await readBody(req);
        const nextSettings = readJsonFile(getSettingsPath(settingsPath));
        ["openaiBaseUrl", "openaiKey", "openaiModel", "mimoTtsKey", "mimoTtsModel", "mimoVoiceDesignModel", "mimoTtsFormat", "mimoTtsVoice", "qweatherApiKey", "qweatherApiHost", "qweatherLocation", "weatherCity"].forEach((key) => {
          if (body[key] !== undefined) nextSettings[key] = String(body[key] || "").trim();
        });
        writeJsonFile(getSettingsPath(settingsPath), nextSettings);
        config = createRuntimeConfig(rootDir, settingsPath, __dirname);
        sendJson(res, 200, { ok: true, settings: editableSettings(config) });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/weather") {
        const location = normalizeLocation({ lat: url.searchParams.get("lat"), lon: url.searchParams.get("lon") });
        const weather = await getWeather(config, location, request);
        sendJson(res, 200, { ok: true, weather });
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/now") {
        const location = normalizeLocation({ lat: url.searchParams.get("lat"), lon: url.searchParams.get("lon") });
        const weather = await getWeather(config, location, request);
        sendJson(res, 200, createNowPayload(config, weather));
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/chat") {
        const body = await readBody(req);
        const message = String(body.message || "").trim();
        if (!message) {
          sendJson(res, 400, { error: "Message is required" });
          return;
        }
        const location = normalizeLocation(body.location);
        const weather = await getWeather(config, location, request);
        const context = {
          message,
          track: body.track || null,
          weather,
          preferences: body.preferences || {},
          history: history.filter((item) => item.role !== "system").slice(-8)
        };
        let replyError = null;
        let reply = "";
        let provider = "openai";
        try {
          reply = await askOpenAI(config, context, request);
        } catch (error) {
          replyError = error.message || String(error);
          provider = "local-fallback";
          reply = fallbackChatReply(message, context.track, weather, replyError);
        }
        const userMessage = { role: "user", content: message, at: new Date().toISOString() };
        const assistantMessage = { role: "assistant", content: reply, at: new Date().toISOString() };
        history.push(userMessage, assistantMessage);
        while (history.length > 25) history.splice(1, 1);
        sendJson(res, 200, {
          ok: true,
          provider,
          replyError,
          track: context.track,
          message: assistantMessage,
          voice: null,
          history: history.filter((item) => item.role !== "system")
        });
        return;
      }
      if (req.method === "POST" && url.pathname === "/api/voice") {
        const body = await readBody(req);
        const text = String(body.text || "").trim();
        const requireAudio = body.requireAudio !== false;
        try {
          const voice = await synthesizeMimoVoice(config, text, body.voiceSettings || {}, request);
          sendJson(res, 200, { ok: true, ...voice });
        } catch (error) {
          const payload = {
            ok: false,
            provider: "none",
            text,
            audioUrl: null,
            mimeType: null,
            reason: error.message || String(error)
          };
          sendJson(res, requireAudio ? 503 : 200, payload);
        }
        return;
      }
      sendJson(res, 404, { error: "API route not found" });
    } catch (error) {
      sendJson(res, 500, { error: error.message || String(error) });
    }
  }

  const server = createServer(handler);
  return {
    handler,
    server,
    start() {
      server.listen(port, "127.0.0.1", () => {
        console.log(`Claude FM capability API running @ http://127.0.0.1:${port}`);
      });
      return server;
    }
  };
}

module.exports = {
  askOpenAI,
  createClaudeCapabilityServer,
  createRuntimeConfig,
  editableSettings,
  fallbackChatReply,
  getWeather,
  normalizeLocation,
  parseEnvFileContent,
  requestJson
};
