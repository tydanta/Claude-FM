# 架构说明

## 总体结构

Claude Private FM 由三层组成：

1. 前端：`public/` 下的原生 HTML/CSS/ES Modules，负责 UI、播放器交互和页面状态。
2. 后端：`src/server/` 下的 Node.js 原生 HTTP 服务，负责 API、SQLite、缓存、天气、AI、TTS、网易云代理。
3. Android：`android/` + `android-node/`，通过 Capacitor 和 nodejs-mobile-cordova 打包移动端原型。

## 关键目录

```text
public/                    前端静态资源
public/index.html          页面结构
public/styles.css          主样式文件
public/app.js              前端入口壳
public/modules/            前端功能模块
src/server/                Node 后端服务
src/liquid-nav.jsx         底部液态导航源文件
scripts/                   检查、smoke、Android 准备脚本
tests/                     Node 和前端模块测试
android/                   Capacitor Android 工程
android-node/              Android 内置 Node 子服务
server.js                  本地服务启动入口
```

## 前端模块边界

### `public/modules/main.js`

前端主装配文件，负责应用初始化、页面连接、播放器状态串联和模块协作。这里不要继续无限堆积 UI 细节，新增功能应优先拆到对应 controller 或 view 模块。

### `public/modules/player/`

播放器相关能力，包括音频控制、播放状态、播放队列、歌词、进度、预加载等。歌词和播放队列的动画/交互应优先在这个目录内维护。

### `public/modules/netease/`

网易云相关前端能力，包括登录、歌单、搜索、歌手、专辑、媒体 URL、喜欢状态同步。喜欢歌曲逻辑修改时要同时关注首页播放器、通知栏/列表、播放详情页。

### `public/modules/settings/`

设置页、API 配置、自定义背景、语音配置等。

### `public/modules/claudio/`

AI 聊天、串场文案、能力检测等。

### `public/modules/ui/`

可复用 UI 片段，如歌曲行、天气图标等。歌曲列表视觉规范应尽量从这里统一，不要每个页面复制一套。

## 后端模块边界

### 服务入口

- `server.js`：启动入口。
- `src/server/app.js`：组合 HTTP 服务、静态资源、API 路由。
- `src/server/route-registration.js`：注册 `/api/*` 路由。
- `src/server/app-context.js`：创建服务上下文和依赖。

### 数据层

- `src/server/database.js`：SQLite 初始化。
- `*-repository.js`：数据访问层，负责读写 SQLite。
- 运行时数据默认在 `data/`，不进入 Git。

### 服务层

- 网易云服务：代理第三方 API、歌曲 URL、歌单、喜欢状态等。
- 天气服务：和风天气或 fallback mock。
- AI 服务：OpenAI-compatible、Anthropic 或 fallback。
- Voice/TTS 服务：Piper、MiMo、Fish Audio 或 fallback。
- 缓存服务：封面、音频 URL、歌词、语音、insight 等。

## Android 架构

- `android/` 是 Capacitor 生成/维护的 Android 工程。
- `android-node/` 是打进 APK 的 Node 子项目，用于本地网易云 API 服务。
- `scripts/prepare-android-node-api.js` 会准备 Android assets。
- `scripts/patch-nodejs-mobile-cordova.js` 会修补 nodejs-mobile-cordova 打包链路。

Android 相关生成物很多，改动前先看 `.gitignore`，不要提交 build 输出、native 临时目录或本机 SDK 路径。

## 数据流简图

```text
用户操作
  -> public/modules/* controller
  -> fetch /api/*
  -> src/server/routes/*
  -> service / repository / external API
  -> SQLite 或 data/cache
  -> 前端状态更新
  -> UI 重新渲染
```

播放链路大致为：

```text
歌曲选择
  -> 前端播放状态
  -> 获取网易云媒体 URL
  -> audio element 播放
  -> 歌词/进度/队列同步
  -> 持久化必要状态
```

注意：不应持久化“重新打开软件后直接恢复到上次秒数播放”的体验，当前要求是重新进入从 `0` 开始。
