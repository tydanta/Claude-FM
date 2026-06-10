# 本地开发与部署指南

## 环境要求

- Node.js `>=20`
- npm
- Windows PowerShell 下建议使用 `npm.cmd`
- Android 打包需要 Android SDK、NDK、Gradle/Android Studio

## 安装依赖

```powershell
npm.cmd install
```

如果 npm 下载 Node 相关资源时走到旧镜像，例如 `npm.taobao.org/dist`，先执行：

```powershell
$env:npm_config_disturl='https://nodejs.org/download/release'
npm.cmd install
```

## 启动开发服务

```powershell
npm.cmd run dev
```

默认访问：

```text
http://localhost:3088
```

## 环境变量

复制模板：

```powershell
Copy-Item .env.example .env
```

常见配置：

- `PORT`：服务端口，默认 `3088`。
- `DATA_DIR`：运行数据目录，默认 `data`。
- `CACHE_DIR`：缓存目录，默认 `data/cache`。
- `NETEASE_LOCAL_API_ENABLED`：是否启动本地网易云 API，默认通常为 `true`。
- `NETEASE_API_BASE_URL`：网易云 API 地址，默认常见为 `http://127.0.0.1:3010`。
- `NETEASE_COOKIE`：可选，网易云 Cookie。
- `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL`：AI 聊天和串场能力。
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`：Claude 相关能力。
- `QWEATHER_API_KEY`：和风天气。
- `PIPER_*` / `MIMO_*` / `FISH_AUDIO_*`：TTS 能力。

没有 API key 时应用仍应能启动，但 AI、真实天气、TTS 会降级。

## 网易云 API 来源

项目里的网易云音乐能力来自非官方 API：

```text
NeteaseCloudMusicApiEnhanced/api-enhanced
```

仓库地址：`https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced`

后续修改 README 或部署说明时要特别标注这个来源，并提醒它不是网易云官方 API。

## 检查命令

JS/构建检查：

```powershell
npm.cmd run check
```

CSS 维护性检查：

```powershell
npm.cmd run check:css
```

HTTP smoke 需要先启动服务，再执行：

```powershell
npm.cmd run smoke:http
```

## Android 打包

首次或依赖变化后先同步：

```powershell
npm.cmd run android:sync
```

构建 debug APK：

```powershell
$env:npm_config_disturl='https://nodejs.org/download/release'
npm.cmd run android:build:debug
```

APK 输出：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Android 本机配置

`android/local.properties` 需要在本机存在，但不要提交。格式示例：

```properties
sdk.dir=你的 Android SDK 路径
ndk.dir=你的 Android NDK 路径
```

如果 Android 构建提示找不到 SDK/NDK，先检查这个文件。

## 部署方式

本地或服务器直接运行：

```powershell
npm.cmd install --omit=dev
npm.cmd start
```

生产部署建议：

- 使用 HTTPS 反向代理。
- 挂载/保留 `data/` 作为持久化目录。
- 不公开 `.env`、`data/`、`node_modules/`。
- 只把需要访问的来源加入 `CORS_ORIGINS`。
- 如果 APK 或远程前端要访问 AI/TTS 能力，配置 `REMOTE_CAPABILITY_BASE_URL`。

## 常见问题

### npm.ps1 被执行策略拦截

PowerShell 下使用：

```powershell
npm.cmd run dev
```

### Android 构建缺 Node API 资源

重新执行：

```powershell
npm.cmd run android:sync
```

### 改 CSS 后看起来没变化

先检查是否被更高优先级选择器覆盖，再跑：

```powershell
npm.cmd run check:css
```

重点查看顶部固定栏、返回键、搜索框、歌曲列表这些历史上容易被多处覆盖的区域。
