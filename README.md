# 蓝毛小女仆 · 电子宠物

> 一只住在网页里的小女仆。会说话、会长大、会被你喂 token。
> **纯前端 · 零后端 · 零账号 · 零统计** —— 所有数据只留在使用者自己的浏览器里。

作者 **YuMoo** · MIT License

[**在线体验**](https://dsh-pet-web.pages.dev/) · [GitHub 仓库](https://github.com/CLoneLING/dsh-pet-web) · [备用地址](https://cloneling.github.io/dsh-pet-web/)

---

## 这是什么

一个单页的电子宠物：打开网页，宠物就在屏幕上等你。它会自己走来走去、随机做动作、偶尔碎碎念；
你可以摸摸它、喂它、和它聊天；聊得越多它长得越快。

它**不需要注册、不需要账号、不需要服务器**。你只要填一把自己的 DeepSeek API Key，
对话就直接从你的浏览器发到 `api.deepseek.com`，费用从你自己的额度扣——不经过任何中间人。

内置了「怎么申请 API Key」的 5 步引导，专门写给完全不懂 AI 的人。

## 亮点

| 能力 | 说明 |
|---|---|
| 🐾 **18 个动作** | 待机、点击回应、工作、睡觉、吃饭、哈欠、跳舞……每 6~18 秒随机播放 |
| 💬 **主界面直聊** | 聊天框就在宠物下方，流式逐字上屏 |
| 🖱️ **拖拽 / 满屏走** | PC 按住拖动，手机上还能开启「自由活动」让它自己散步 |
| 📱 **体感跟随** | 手机倾斜、桌面鼠标方向，宠物跟着动（无陀螺仪时可用手指跟随） |
| 🎭 **情绪驱动表情** | 模型在回复末尾附 `[[mood:shy]]` 标签，程序剥掉后按情绪切动作 |
| 💰 **余额显示** | 自动查 `/user/balance`，页脚实时显示剩余额度 |
| 📔 **吃 DSH 日志** | 导入 `.dsh` 的会话统计，按 token 换经验 |
| 🔑 **自带 Key 引导** | 5 步向导 + 悬浮清单，从注册到粘贴一条龙 |
| 🔄 **跨设备口令** | 一串 `PET1:` 开头的字符，粘贴即搬家（不含 Key） |
| 🩺 **开机体检** | 存储 / 素材 / 视频解码 / 透明通道 / 接口连通，逐项自检 |

## 30 秒上手

**方式 A：直接打开在线地址**

<https://dsh-pet-web.pages.dev/>

**方式 B：本地跑**

```bash
git clone https://github.com/CLoneLING/dsh-pet-web.git
cd dsh-pet-web
python3 -m http.server 8080   # 或 npx serve .
# 打开 http://localhost:8080/
```

**方式 C：单文件版**

```bash
node scripts/bundle.mjs        # 产出 dist/pet-standalone.html（约 13 MB，素材全内联）
```

双击这个 HTML 就能用，`file://` 下也能调 API（DeepSeek 允许任意 Origin 跨域）。

## 第一次打开会发生什么

1. 弹出 5 步引导：为什么需要 Key、怎么申请、怎么粘贴
2. 点「打开官网」跳到 DeepSeek 开放平台（**官网禁止被 iframe 嵌入，所以是新窗口**），
   页面底部会留一张悬浮清单：注册 → 充值 → 创建 API Key → 复制
3. 回来粘贴 `sk-` 开头的 Key → 测试 → 完成
4. 也可以点「先跳过」，用**演示模式**先玩（不调用任何 API）

## 目录结构

```
index.html              页面骨架（引导 / 设置 / 内嵌聊天）
style.css               样式
app.js                  全部逻辑（状态机、聊天、引导、日志导入、体检）
assets/gifs/            14 个透明 GIF（220×124，默认播放）
assets/webm/            18 个高清 WebM（640×360，VP9+Alpha，设置里可开）
sources.json            素材清单：sha256、帧数、CDN 回退顺序
scripts/fetch-assets.mjs  从上游仓库重新拉素材
scripts/bundle.mjs      打包成目录版 / 单文件版
scripts/smoke.mjs       headless 冒烟测试（21 项断言）
wrangler.jsonc          Cloudflare Workers 静态资源配置
THIRD-PARTY-NOTICES.md  第三方素材许可
DEPLOY.md               部署与分发选型
```

## 开发

没有构建工具、没有框架、没有打包步骤。改完刷新即可。

```bash
npm i -D jsdom          # 只有跑测试需要
npm test                # 21 项断言：引导 → 摸摸 → 聊天 → 存档 → 口令 → 情绪标签
npm run build           # 打包到 dist/
```

兼容目标：Android WebView / 鸿蒙 ArkWeb（Chromium 70+）。
因此代码里**不使用** `?.`、`??`、`??=`、顶层 await 等新语法。

## 宠物怎么长大

| 行为 | 效果 |
|---|---|
| 聊天 | +8~28 经验，心情 +6 |
| 摸摸 | +2 经验，心情 +4，飘心心 |
| 喂食 | +4 经验，饱食 +18（10 次解锁成就） |
| 吃 DSH 日志 | 按 token 量折算，单次最高 +600 经验 |
| 每天来一次 | 连续天数 +1，有成就 |

**吃日志**：把 `.dsh/storages/session_projcache/sessions/session-*.json` 选进来，
程序读取 `tokenUsage.val.totals`，按 token 换经验——这就是"用 DSH 养宠物"的味道。

## 数据与隐私

- 存档在 `localStorage['dshpet.save.v1']`，只有本机能读
- API Key 明文存本地，**建议申请一把"宠物专用"Key 并设额度上限**
- 「导出存档」自动剔除 Key；「清除 Key」一键回到演示模式
- 页面没有统计、埋点、第三方脚本、Cookie

## 部署

三种方式（详见 [DEPLOY.md](DEPLOY.md)）：

1. **Cloudflare Pages**（当前线上）：连仓库 → 构建命令留空 → 输出目录 `.`
2. **Cloudflare Workers**：仓库已带 `wrangler.jsonc`（静态资源模式），部署命令 `npx wrangler deploy`
3. **GitHub Pages**：Settings → Pages → main / root

> 素材必须**同包分发**，不要外链 `raw.githubusercontent.com` 或 `cdn.jsdelivr.net`（国内会被重置）。

## 放到网上给别人用

这套架构天生适合公开分发：**没有后端，就没有可被滥用的资源**。

三条红线：

1. **永远不要把 Key 写进代码、仓库、构建产物或环境变量**
2. **不要加统计 / 广告 / 第三方 SDK**，否则"无统计"的承诺就破了
3. **不要去掉素材版权声明**：`LICENSE`、`THIRD-PARTY-NOTICES.md`、页面设置里的「开源许可」三处都要留着

## 路线图

- [x] 高清动作（VP9 Alpha）
- [x] 内嵌聊天 / 随机动作 / 满屏走 / 拖拽
- [x] 情绪标签驱动表情
- [x] 余额查询、体检、跨设备口令
- [ ] 更多动作（上游还有 90+ 个未接入）
- [ ] 桌面端窗口模式
- [ ] 自绘素材包（摆脱素材依赖）
- [ ] 多语言

## 已知限制

- 素材原图 220×124，GIF 放大到 117px 显示时略有软化；高清模式用 640×360 的 WebM
- 鸿蒙 / 微信内置浏览器可能拦截静态资源，页面顶部会提示「在浏览器中打开」
- 体感在部分 Android 设备上拿不到数据（无陀螺仪或被浏览器屏蔽），可用手指跟随兜底

## 许可

代码 MIT，作者 **YuMoo**。
宠物形象与动作素材来自 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（MIT），
详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。上游 `memes/` 里的梗图属社区二创，**未收录**。
