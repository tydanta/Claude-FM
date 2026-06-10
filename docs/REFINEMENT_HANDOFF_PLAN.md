# Claude Private FM 后续开发交接文档

这份文档是后续继续开发时的入口。旧的交接/计划文档已经不在 Git 历史里，`docs/` 目录也为空，无法从本仓库恢复；这里按当前项目真实状态重新整理一版本地可用的开发交接记录。

## 先读顺序

1. `docs/REFINEMENT_HANDOFF_PLAN.md`：当前交接入口，说明项目状态、最近改动和后续开发方式。
2. `docs/DEVELOPMENT_PROGRESS.md`：功能、UI、构建进度。
3. `docs/ARCHITECTURE_NOTES.md`：项目架构和关键模块边界。
4. `docs/DEVELOPMENT_GUIDE.md`：本地运行、测试、Android 打包方法。
5. `docs/DEVELOPMENT_CONSTRAINTS.md`：开发约束、CSS 约束、提交约束。

## 当前仓库状态

- 远程仓库：`https://github.com/tydanta/Claude-FM.git`
- 主分支：`main`
- 当前公开 README 已标注：网易云 API 来源为 `NeteaseCloudMusicApiEnhanced/api-enhanced`。
- `docs/` 下原有旧文档不可从 Git 恢复，因为它们是在初始 Git 历史之前被删除的。
- 本次重新写入的文档面向本地后续开发，内容不包含密钥，不包含需要提交的运行时数据。

## 项目定位

Claude Private FM 是一个本地优先的私人音乐电台/PWA/Android 原型。核心体验是：

- 首页播放器、播放详情页、歌词、播放队列。
- 网易云登录、歌单、喜欢歌曲、搜索、歌手详情、专辑详情。
- 天气上下文、AI 串场/聊天、TTS 能力。
- Node 本地服务 + SQLite 本地状态。
- Capacitor Android + nodejs-mobile-cordova，把前端和本地网易云 API 能力打进 APK。

## 最近开发重点

- 调整了顶部固定栏高度、搜索框展开/收起逻辑、返回键全局对齐。
- 调整了歌单详情、搜索结果、歌手详情、专辑详情的列表布局和顶部间距。
- 新增独立专辑详情页，并从歌手详情页专辑列表进入。
- 统一了通知栏、首页、播放详情中的喜欢爱心逻辑。
- 修正重启后喜欢状态刷新、播放进度不应从上次秒数恢复的问题。
- 优化播放详情页歌词整体滑动动画。
- 优化播放详情页播放队列弹窗，从上方抽屉流畅滑出。
- 调整播放队列序号为 `1, 2, 3`，白色、居中对齐。
- 修正歌词选中框里的播放按钮焦点蓝框，以及未选中歌词时误触快进行为。
- 调整歌曲行点击态：只在按下/点击瞬间显示半透明反馈，不做持续选中。
- 做过一次 CSS 维护性整理，减少散落覆盖和无用选择器。

## 当前推荐开发方式

1. 修改前先读相关模块，不凭记忆改。
2. UI 细节优先沿用现有布局变量和类名，不新增重复的局部魔法值。
3. CSS 改动后跑 `npm.cmd run check:css`。
4. JS/构建相关改动后跑 `npm.cmd run check`。
5. Android 打包前跑完整 `npm.cmd run android:build:debug`。
6. 不提交 `data/`、`node_modules/`、Android build 输出、APK、`.env`、`android/local.properties`。

## 常用命令

PowerShell 下优先使用 `npm.cmd`，避免执行策略拦截 `npm.ps1`。

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run check
npm.cmd run check:css
npm.cmd run android:build:debug
```

如果安装 Android/node 依赖时遇到旧 disturl 或 `npm.taobao.org/dist` 相关问题，先设置：

```powershell
$env:npm_config_disturl='https://nodejs.org/download/release'
```

## 后续需求接手原则

- 用户非常看重“体验顺”，UI 修改要优先考虑手感、对齐、遮挡、动画是否顺滑。
- 用户经常会用截图指出问题，优先按截图中的真实视觉效果修，不只看代码意图。
- 页面顶部固定栏、返回键、搜索框、播放器卡片、播放队列、歌曲列表是高频被调区域，避免各页面各写一套位置。
- 喜欢歌曲逻辑必须和首页播放器保持一致，不能只改图标外观。
- 播放详情页歌词交互要明确“先选中，再播放”，不要让未选中歌词误触快进。
- Android 实机打包前要确保本地依赖已装，且 `android/local.properties` 只留在本机。

## 可继续优化的方向

- README 当前公开内容如果出现乱码，应单独重写一版干净 UTF-8 README。
- 继续把顶部控制区、歌曲列表、抽屉弹窗抽成更稳定的 CSS 结构，减少页面级覆盖。
- 给专辑详情、歌手详情、搜索结果、歌单详情补更多前端行为测试。
- Android 实机体验可继续检查：音频后台、返回键、网络登录、节点 API 启动速度。
