# Claude Private FM

Claude Private FM 是一个纯 Vibe Coding 产物：需求、UI 调整、架构拆分、测试补充和 Android 打包链路，都是在连续的人机协作里一点点长出来的。它不是商业产品模板，也不是标准团队项目脚手架，而是一个围绕“私人音乐电台体验”快速迭代出来的本地优先应用。

这个仓库适合拿来研究 Vibe Coding 如何把一个想法推进成可运行项目，也适合继续改造成自己的私人 FM、网易云歌单播放器、AI 音乐陪伴工具或移动端原型。

## 项目定位

Claude Private FM 是一个本地优先的私人音乐电台。它把 PWA 播放器、网易云音乐适配、本地 Node.js 服务、SQLite 状态存储、天气上下文、AI 聊天/串场文案、TTS 语音和 Android 打包链路放在一个项目里。

核心目标不是做一个通用音乐平台，而是做一个“只服务自己”的听歌界面：打开以后能看到当前时间、天气、推荐、歌词、播放队列、我的歌单、歌手详情、专辑详情，还可以让 AI 用当前歌曲和上下文聊几句。

## 主要功能

- 首页私人 FM 播放器：播放、暂停、上一首、下一首、播放模式、播放队列、进度条、音量和当前歌词预览。
- 播放详情页：大歌词列表、歌词定位播放、播放控制、喜欢状态、播放队列抽屉。
- 我的音乐页：网易云登录状态、用户资料卡、歌单列表、歌单详情、歌单内搜索。
- 搜索音乐：通过网易云接口搜索歌曲，并支持播放、收藏、下一首播放。
- 歌手详情页：歌手信息、热门歌曲、专辑列表、分页。
- 专辑详情页：从歌手专辑进入独立专辑详情，以列表模式展示专辑歌曲。
- 喜欢与歌单同步：支持喜欢歌曲、取消喜欢、加入/移出歌单等网易云相关操作。
- 媒体缓存：封面、音频 URL、歌词和推荐上下文会做本地缓存，减少重复请求。
- 天气上下文：支持和风天气；没有 API key 时使用 mock/fallback 天气。
- AI 串场与聊天：根据当前歌曲、天气、时间段、日程和偏好生成 DJ 文案，也可以在聊天面板里问当前歌曲相关问题。
- TTS 语音：支持本地 Piper、MiMo TTS、Fish Audio；没有语音 API 时会退回浏览器/无语音模式。
- 设置页：可配置天气、远程能力地址、AI key、TTS 音色、自定义背景。
- Android 原型：包含 Capacitor Android 工程、Node.js Mobile + 网易云本地 API 的打包准备脚本。

## 技术架构

```text
Claude Private FM
├─ public/                    # PWA 前端静态资源
│  ├─ index.html              # 页面结构
│  ├─ styles.css              # 主样式，含核心区域中文注释
│  ├─ app.js                  # 前端入口壳
│  ├─ liquid-nav.js           # React/liquid-glass 打包产物
│  └─ modules/                # 前端模块：播放器、网易云、设置、聊天、导航等
├─ src/
│  ├─ liquid-nav.jsx          # 底部液态导航源码
│  └─ server/                 # Node.js 后端服务
│     ├─ app.js               # 服务组合入口
│     ├─ route-registration.js# API 路由注册
│     ├─ routes/              # API 路由分组
│     ├─ database.js          # SQLite 初始化
│     ├─ *-service.js         # 天气、网易云、缓存、语音、AI 等服务
│     └─ *-repository.js      # SQLite repository
├─ android/                   # Capacitor Android 工程骨架
├─ android-node/              # Android 内置网易云 API 的 Node 子项目
├─ scripts/                   # CSS 审计、HTTP smoke、Android 准备脚本
├─ tests/                     # Node 测试与前端模块测试
├─ server.js                  # 本地服务启动入口
├─ package.json               # 脚本和依赖
└─ .env.example               # 环境变量模板
```

### 前端

前端是原生 HTML/CSS/ES Modules 为主，不是完整 React SPA。只有底部 liquid navigation 使用 `src/liquid-nav.jsx` 通过 esbuild 打成 `public/liquid-nav.js`。

主要前端模块包括：

- `public/modules/main.js`：应用启动、页面状态、播放器状态总线。
- `public/modules/player/`：播放状态、队列、歌词、进度、预加载。
- `public/modules/netease/`：网易云登录、歌单、搜索、歌手、专辑、媒体 URL。
- `public/modules/settings/`：API 设置、自定义背景、语音设置。
- `public/modules/claudio/`：AI 能力检测、聊天、串场 insight。
- `public/modules/ui/`：歌曲行、天气图标等可复用 UI 片段。

### 后端

后端是 Node.js 原生 HTTP 服务，不依赖 Express。服务启动后同时提供静态资源和 `/api/*` 接口。

核心职责：

- 读取 `.env` 配置。
- 初始化 `data/claude-fm.sqlite`。
- 代理网易云 API。
- 管理播放状态、歌单、缓存、喜欢状态和本地 KV。
- 提供天气、AI 聊天、DJ 文案、TTS 语音、背景上传等接口。
- 在本地模式下自动启动 `NeteaseCloudMusicApi` 子进程。

### 数据与缓存

运行时数据默认写入 `data/`：

- `data/claude-fm.sqlite`：SQLite 数据库。
- `data/cache/`：封面、音频、歌词、语音、insight 等缓存。
- `data/backgrounds/`：用户上传背景图。
- `data/state.json`：部分前端持久状态。

这些都是本地运行数据，已经被 `.gitignore` 排除，不建议提交到 GitHub。

## API 与环境变量

复制 `.env.example` 为 `.env` 后按需填写：

```bash
cp .env.example .env
```

Windows PowerShell 可以用：

```powershell
Copy-Item .env.example .env
```

### 基础配置

| 变量 | 说明 | 必填 |
| --- | --- | --- |
| `PORT` | Web 服务端口，默认 `3088` | 否 |
| `DATA_DIR` | 运行数据目录，默认 `data` | 否 |
| `CACHE_DIR` | 缓存目录，默认 `data/cache` | 否 |
| `CORS_ORIGINS` | 允许跨域来源，远程访问时可配置 | 否 |
| `REMOTE_CAPABILITY_BASE_URL` | APK 或远程前端代理 AI/语音能力的服务地址 | 否 |

### 网易云音乐

| 变量 | 说明 | 必填 |
| --- | --- | --- |
| `NETEASE_LOCAL_API_ENABLED` | 是否由本项目自动启动本地 `NeteaseCloudMusicApi`，默认 `true` | 否 |
| `NETEASE_API_BASE_URL` | 网易云 API 地址，默认 `http://127.0.0.1:3010` | 否 |
| `NETEASE_COOKIE` | 网易云 Cookie。可不填，前端也支持登录流程 | 否 |
| `NETEASE_REAL_IP` | 需要伪装真实 IP 时填写 | 否 |
| `NETEASE_API_TIMEOUT_MS` | 网易云请求超时时间 | 否 |
| `NETEASE_URL_CACHE_TTL_MINUTES` | 歌曲 URL 缓存时间 | 否 |
| `NETEASE_AUDIO_LEVEL` | 音质偏好，例如 `standard` | 否 |

特别标注：本项目的网易云音乐相关 API 能力来源于 [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)。这是非官方网易云音乐 API 项目，本仓库只是将它作为本地/Android 音乐能力的一部分进行适配和调用。

说明：项目依赖网易云音乐非官方 API。当前本地开发链路会通过 npm 依赖和 `NETEASE_LOCAL_API_ENABLED=true` 尝试自动启动本地网易云 API 子进程。

### AI 聊天与 DJ 文案

| 变量 | 说明 | 必填 |
| --- | --- | --- |
| `OPENAI_BASE_URL` | OpenAI-compatible Chat Completions 地址，示例默认可接 DeepSeek | 推荐 |
| `OPENAI_CHAT_PATH` | 聊天接口路径，DeepSeek 常用 `/chat/completions`，OpenAI 常用 `/v1/chat/completions` | 否 |
| `OPENAI_API_KEY` | OpenAI-compatible API key，用于聊天和歌曲 insight | 推荐 |
| `OPENAI_MODEL` | 聊天/insight 模型，例如 `deepseek-v4-flash`、`gpt-4o-mini` | 否 |
| `INSIGHT_PROMPT_VERSION` | DJ 文案 prompt 版本标记 | 否 |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key，用于 Claude 聊天或串场备用 | 否 |
| `ANTHROPIC_MODEL` | Claude 模型名 | 否 |

不填 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 时，应用仍可启动，但 AI 文案会走 mock/fallback 文本，聊天能力会明显受限。

### 天气

| 变量 | 说明 | 必填 |
| --- | --- | --- |
| `QWEATHER_API_KEY` | 和风天气 API key | 否 |
| `QWEATHER_API_HOST` | 和风天气 host，默认 `devapi.qweather.com` | 否 |
| `QWEATHER_LOCATION` | 和风天气 location id，例如上海 `101020100` | 否 |
| `WEATHER_CITY` | 页面显示城市名 | 否 |

不填天气 key 时会使用本地 fallback 天气，播放器不受影响。

### TTS 语音

| 变量 | 说明 | 必填 |
| --- | --- | --- |
| `PIPER_ENABLED` | 是否启用本地 Piper，默认 `true` | 否 |
| `PIPER_COMMAND` | Piper 命令路径，默认 `piper` | 否 |
| `PIPER_VOICE` | Piper voice 模型路径 | 否 |
| `MIMO_TTS_API_KEY` | MiMo TTS / voice design API key | 否 |
| `MIMO_TTS_BASE_URL` | MiMo API base URL | 否 |
| `MIMO_TTS_MODEL` | MiMo 预置音色模型 | 否 |
| `MIMO_VOICE_DESIGN_MODEL` | MiMo 自定义音色模型 | 否 |
| `MIMO_TTS_VOICE` | MiMo 预置音色名 | 否 |
| `MIMO_TTS_FORMAT` | 输出格式，默认 `wav` | 否 |
| `MIMO_CHAT_ENABLED` | 是否允许 MiMo 作为聊天提供方 | 否 |
| `MIMO_CHAT_MODEL` | MiMo 聊天模型 | 否 |
| `FISH_AUDIO_API_KEY` | Fish Audio API key | 否 |
| `FISH_AUDIO_REFERENCE_ID` | Fish Audio reference id | 否 |
| `FISH_AUDIO_MODEL` | Fish Audio 模型 | 否 |

语音优先级大致是：缓存命中优先，然后按配置尝试 MiMo / Piper / Fish Audio，最后退回浏览器或无语音结果。具体行为以 `src/server/voice-service.js` 为准。

## 本地开发

### 环境要求

- Node.js `>=20`
- npm
- 可选：Piper 命令行与 voice 模型
- 可选：Android Studio、Android SDK、NDK、Gradle，用于 Android 构建

### 安装依赖

```bash
npm install
```

### 启动开发服务

```bash
npm run dev
```

打开：

```text
http://localhost:3088
```

### 常用检查

```bash
npm run check
npm run check:css
```

`npm run check` 会检查关键 JS 文件语法，并重新打包 `public/liquid-nav.js`。

`npm run check:css` 会运行 CSS selector 审计，避免样式里堆出未使用选择器。

### HTTP smoke

先启动服务，然后执行：

```bash
npm run smoke:http
```

## Android 开发与打包

Android 工程基于 Capacitor，并额外接入 `nodejs-mobile-cordova`，用于在 APK 内运行网易云 API 子服务。

首次准备：

```bash
npm install
npm run android:sync
```

打开 Android Studio：

```bash
npm run android:open
```

构建 debug APK：

```bash
npm run android:build:debug
```

注意：

- `android/local.properties` 是本机 SDK/NDK 路径，已被忽略，不要提交。
- `android/**/build/`、`.cxx/`、`cdvnodejsmobile/`、`nodejs-project/` 等都是生成物，已被忽略。
- 如果 Android 构建缺少 Node API 资产，重新执行 `npm run android:sync`。

## 部署

### 本机或服务器直接运行

```bash
npm install --omit=dev
cp .env.example .env
npm start
```

然后访问：

```text
http://服务器地址:3088
```

生产部署时建议：

- 使用反向代理提供 HTTPS。
- 不要公开 `.env`、`data/`、`node_modules/`。
- 只把必要来源加入 `CORS_ORIGINS`。
- 如果前端和远程能力服务分开部署，配置 `REMOTE_CAPABILITY_BASE_URL`。

### Docker

仓库目前只有 `.dockerignore`，没有正式 Dockerfile。可以自行按 Node 20 镜像封装，核心启动命令是：

```bash
npm install --omit=dev
npm start
```

运行时需要挂载 `data/` 作为持久化目录。

## 上传 GitHub 前的清理建议

这些文件不要提交：

- `.env`
- `node_modules/`
- `data/`
- `android/**/build/`
- `android/**/.cxx/`
- `android/local.properties`
- Android 同步出来的 `nodejs-project/`、`cdvnodejsmobile/`
- 日志、APK、AAR、本地截图

当前 `.gitignore` 已覆盖这些常见生成物。

## 现状与限制

- 这是 Vibe Coding 快速迭代产物，功能密度高，部分 CSS 和交互逻辑仍带有连续打磨留下的覆盖痕迹。
- README 里的 API 名称以当前代码为准，第三方服务的计费、额度和接口变更需要自己确认。
- 网易云相关能力依赖非官方 API，来源标注为 [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)，稳定性取决于该接口项目、账号状态和网易云侧策略。
- 没有 API key 时应用能运行，但 AI 串场、聊天、真实天气和高质量语音会降级。
