# 部署与分发

这个项目是**纯静态**的：一个 HTML + 一个素材目录。没有构建、没有 Node 服务、没有数据库。

先做一个判断：

| 你想怎么给朋友 | 推荐做法 | 需要域名吗 |
|---|---|---|
| 只给一两个人 | 发 `dist/pet.zip` 或 `dist/pet-standalone.html` | 不要 |
| 发一条链接 | EdgeOne Pages / Cloudflare Pages 免费子域 | 不要 |
| 好记、截图好看 | 自定义域名 CNAME 到 Pages | 要 |

**域名不会让国内更快**，只会让地址更好看。决定速度的是节点位置。

---

## 方案 A：不部署（最省事，也最稳）

把 `dist/pet-standalone.html` 发给对方，浏览器打开即可。

- 优点：零成本、零维护、断网也能用（除了调 API）
- 缺点：更新时要重新发文件

## 方案 B：EdgeOne Pages（国内节点，免费额度）

1. 注册腾讯云账号并完成实名
2. 把仓库推到 GitHub（或用本地目录上传）
3. 在 EdgeOne Pages 里「新建项目」→ 关联仓库
4. 构建配置：
   - 框架预设：**无 / 静态**
   - 构建命令：**留空**（或 `node scripts/bundle.mjs --no-inline`）
   - 输出目录：**`dist`**（或在仓库根直接指向 `/`）
5. 部署完成后会得到一个 `*.edgeone.app` 子域，可直接发给朋友
6. 想用自己的域名：在「域名管理」里绑定，按提示去 DNS 加 CNAME

> 具体菜单名以控制台为准。国内节点**必须实名**，但如果只用平台子域、不绑自定义域名，通常不涉及 ICP 备案。

## 方案 C：Cloudflare Pages（推荐，免备案，免费）

1. 仓库推到 GitHub（本地仓库已初始化好，见文末）
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
3. 选仓库，生产分支填 **main**
4. 构建配置照抄：

   | 项 | 填什么 |
   |---|---|
   | Framework preset | **None** |
   | Build command | **留空** |
   | Build output directory | **.** |

5. Save and Deploy → 得到 `https://<项目名>.pages.dev`

> 不需要构建：根目录的 `index.html` + `style.css` + `app.js` + `assets/` 本身就是可运行站点。
> `dist/` 里的单文件版只用于「发文件给朋友」，不必上 CI。

绑定自己的域名（可选）：Pages 项目 → Custom domains → 添加域名。
域名在 Cloudflare 托管时自动加 CNAME；不在的话按提示去注册商改 DNS。**海外节点，不需要 ICP 备案。**

## 方案 D：国内对象存储 + 自定义域名（**必须备案**）

阿里云 OSS / 腾讯云 COS 都能开静态网站托管，但有两个硬门槛：

1. **域名必须完成 ICP 备案**，否则 80/443 会被拦
2. 直接访问对象存储的**默认域名**时，HTML 常被强制下载而不是渲染

所以这条路适合"已经有备案域名"的人，不适合从零开始。

---

## 通用注意事项

- **不要**把 API Key 写进任何文件、环境变量或构建产物；本项目压根不需要 Key
- 素材必须和页面**同源**（一起打包）。不要把 GIF 外链到 `raw.githubusercontent.com` 或 `cdn.jsdelivr.net`——国内实测会被重置，页面会变成一堆裂图
- 更新页面后，让朋友**强制刷新**（或在链接后加 `?v=2`）以绕过缓存
- 如果绑了自定义域名，先确认 HTTPS 证书已签发（Pages 平台自动签，别自己买证书）
- 备案、实名、域名持有人信息必须真实，后续修改很麻烦

## 部署完成后自检

1. 手机浏览器打开链接，首屏能出现宠物（不是空白）
2. 点「先跳过，随便逛逛」→ 点宠物有气泡、能进聊天
3. 填一把测试 Key → 「测试连接」显示余额
4. 断网后刷新：页面能打开（离线缓存看平台配置），但聊天会提示网络错误
5. 用无痕窗口打开：应该是一套全新存档（证明没有服务端状态）

---

## 本地仓库已就绪

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

25 个文件、约 7.5 MB（含 14 个 GIF）。`.gitignore` 已排除 `dist/`、`node_modules/` 以及工作区里与本项目无关的文件。
