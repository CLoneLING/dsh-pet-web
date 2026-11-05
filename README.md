# 蓝毛小女仆 · 电子宠物

一只住在网页里的小宠物：会说话、会长大、会被你喂 token。
**纯前端、零后端、零账号、零统计** —— 所有数据都留在使用者自己的浏览器里。

- 形象与动作素材来自 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)（MIT），详见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
- 内置「如何申请 API Key」引导，面向完全不懂 AI 的人
- 每人用自己的 Key、花自己的额度，互不影响

## 30 秒上手

**方式 A：直接双击（最简单）**

```
打开 dist/pet-standalone.html
```

单个文件，素材已内联，`file://` 下也能正常聊天。

**方式 B：本地起个服务（改代码时用）**

```bash
# 任选其一
python3 -m http.server 8080
npx serve .
```

浏览器打开 `http://localhost:8080/`。

## 第一次打开会发生什么

1. 弹出 5 步引导：为什么需要 Key、怎么申请、怎么粘贴
2. 引导里点「打开官网」会跳到 DeepSeek 开放平台（**官网禁止被 iframe 嵌入，所以是新窗口**），
   页面底部会留一张悬浮清单：注册 → 充值 → 创建 API Key → 复制
3. 回来粘贴 `sk-` 开头的 Key → 测试 → 完成
4. 也可以点「先跳过」，用**演示模式**先玩（不会真的调用 API）

## 目录结构

```
index.html              页面骨架（含引导/设置/聊天面板）
style.css               样式
app.js                  全部逻辑（状态机、聊天、引导、日志导入）
assets/gifs/            14 个透明 GIF（220×124，回退用）
assets/webm/            14 个高清 WebM（640×360，VP9+Alpha，默认播放）
sources.json            素材清单：每个状态的 sha256、帧数、CDN 回退顺序
scripts/fetch-assets.mjs  从上游仓库重新拉素材
scripts/bundle.mjs      打包成目录版 / 单文件版
scripts/smoke.mjs       headless 冒烟测试（需要 jsdom）
THIRD-PARTY-NOTICES.md  第三方素材许可
```

## 打包与分发

部署到网上的几种选型见 [DEPLOY.md](DEPLOY.md)。

```bash
node scripts/bundle.mjs            # 目录版 + pet.zip + 单文件版
node scripts/bundle.mjs --no-inline # 只出目录版（省 11MB）
```

产物在 `dist/`：

| 产物 | 大小 | 适合 |
|---|---|---|
| `dist/index.html` + `dist/assets/` | 57 KB + 8 MB | 想随时替换单个素材 |
| `dist/pet.zip` | 约 7.2 MB | 微信/QQ 传文件 |
| `dist/pet-standalone.html` | 约 11.4 MB | 一个文件搞定，双击即开 |

> 国内网络下不要用 `raw.githubusercontent.com` / `cdn.jsdelivr.net` 做素材源（实测会被重置）。
> 素材必须**同包分发**，这也是 `--inline` 存在的理由。

## 宠物怎么长大

| 行为 | 效果 |
|---|---|
| 聊天 | +8~28 经验，心情 +6 |
| 摸摸 | 飘心心；喂食/升级飘星星 |
| 摸摸 | +2 经验，心情 +4 |
| 喂食 | +4 经验，饱食 +18（10 次解锁成就） |
| **吃 DSH 日志** | 按 token 量折算，单次最高 +600 经验 |
| 每天来一次 | 连续天数 +1，有成就 |

**吃日志**：在电脑上打开 `.dsh/storages/session_projcache/sessions/`，把里面的
`session-*.json` 选进来（可多选）。程序读取里面的 `tokenUsage.val.totals`，
按 token 数换经验——这就是"DSH 养宠物"的味道。

> 原始日志 `sessions/*/session.v4.jsonl.zstd` 是 zstd 压缩的，浏览器不方便解；
> 用投影文件（明文 JSON）就够了。

## 数据与隐私

- 存档在 `localStorage['dshpet.save.v1']`，只有本机能读
- API Key 明文存本地，**建议申请一把"宠物专用"Key 并设额度上限**
- 「导出存档」会自动剔除 Key；「清除 Key」一键回到演示模式
- 页面没有任何统计、埋点、第三方脚本

## 数据口令（跨设备一键同步）

设置 → **数据口令** → 「生成口令」，得到一串 `PET1:` 开头的字符；在另一台设备打开同一个页面，
把口令粘进输入框点「导入口令」，宠物（等级、经验、心情、成就、最近对话）就搬过去了。

- 口令**不含 API Key**，换设备后要重新填一把（Key 本来就该各自独立）
- 口令是明文压缩后的 base64，任何人拿到都能还原存档，**别发到公开群**
- 想要文件形式就用「导出存档 / 导入存档」

## 体检（防呆自检）

设置 → **运行体检**，逐项检查：

| 项 | 失败意味着 |
|---|---|
| 本地存储 | 无痕模式，存档会丢 |
| 动作素材（GIF） | 网络/防盗链把静态资源拦了 |
| 高清解码（VP9/WebM） | 老内核不支持视频，会自动回退 GIF |
| 透明通道 | 视频能放但没透明，会出现黑底 → 关掉「高清动作」 |
| DeepSeek 接口 | 网络到不了 `api.deepseek.com` |

底部「复制诊断信息」会把结果 + UA + 地址打包成文本，方便贴给别人排查。

**微信内置浏览器**会在顶部提示：点右上角「···」→ 在浏览器中打开，素材和视频更稳。
素材加载失败时，宠物位置会显示一个虚线占位符，并提示运行体检，而不是留一块空白。

## 常见问题

**打开是一片空白？**
用 `file://` 打开 `dist/pet-standalone.html` 最稳；如果是目录版，请通过 http 访问（`python3 -m http.server`）。

**提示 401？** Key 无效或复制不全，重新创建一把。

**提示 402？** 账户余额不足，去官网「充值」页充最小额度。

**提示 402 但余额充足？** 确认模型选的是 `deepseek-chat`，`deepseek-reasoner` 更贵。

**换了手机，宠物没了？** 存档不跟随账号。旧设备「导出存档」→ 新设备「导入存档」。

**能多人共用一只宠物吗？** 不能，也不需要——每台设备各自独立。

## 开发

没有构建工具、没有依赖、没有打包步骤。改完 `index.html` / `style.css` / `app.js` 刷新即可。
打包用 `node scripts/bundle.mjs`。

兼容目标：Android WebView / 鸿蒙 ArkWeb（Chromium 70+）。
因此代码里**不使用** `?.`、`??`、`??=`、顶层 await 等新语法。

## 放到网上给别人用

这个项目的架构天生适合公开分发：**没有后端，就没有可被滥用的资源**。

- 每个人填自己的 Key、花自己的额度，你既不代付也不保管凭证
- 页面不收集任何数据、不加载第三方脚本、不写 cookie
- 有人没有 Key 也能用演示模式，不会看到报错页

三条红线：

1. **永远不要把 Key 写进代码、仓库、构建产物或环境变量** —— 公开仓库里的 Key 几分钟就会被扫走
2. **不要加统计 / 广告 / 第三方 SDK**，否则"无统计"的承诺就破了，也引入合规负担
3. **不要去掉素材版权声明**：`LICENSE`、`THIRD-PARTY-NOTICES.md`、页面设置里的「开源许可」三处都要留着（MIT 硬性要求）

规模参考：首屏只加载待机那一个 GIF（约 0.6 MB），其余动作按需加载。Cloudflare Pages 免费额度对"几千人/天"绰绰有余。
国内访问速度取决于网络，与部署方式无关——所以**发文件（`pet.zip`）这条路要一直保留**。

未成年使用者请在监护人同意下使用；页面页脚已注明。

## 许可

代码 MIT。素材见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)（上游 MIT，需保留版权声明）。
上游 `memes/` 里的梗图属于社区二创，**未收录**。
