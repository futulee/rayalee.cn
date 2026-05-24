# 部署指南

## 本地开发

```bash
npm install
npm run dev
```
浏览器打开 http://localhost:5173 即可。

iPad 同 WiFi 时访问 http://192.168.0.160:5173（或终端显示的 Network 地址）。

---

## 上线到 Cloudflare（免费）

### 第一步：安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 第二步：登录 Cloudflare（用 GitHub 账号）

```bash
wrangler login
```
浏览器会弹出授权页面，点"允许"即可。

### 第三步：创建 D1 数据库

```bash
wrangler d1 create english-adventure
```
输出类似：
```
✅ Created D1 database 'english-adventure'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
把这个 `database_id` 填入 `wrangler.toml` 的 `REPLACE_WITH_YOUR_DATABASE_ID` 处。

### 第四步：初始化数据库表

```bash
wrangler d1 execute english-adventure --file=worker/schema.sql
```

### 第五步：部署 Worker

```bash
wrangler deploy
```
部署后会显示 API 地址，类似：
```
https://english-adventure-api.你的子域名.workers.dev
```

### 第六步：配置前端 API 地址

创建 `.env.local` 文件：
```
VITE_API_URL=https://english-adventure-api.你的子域名.workers.dev
```

### 第七步：部署前端到 Cloudflare Pages

1. 把整个项目 push 到 GitHub 仓库
2. 打开 https://pages.cloudflare.com
3. 点"Connect to Git" → 选择仓库
4. 构建设置：
   - 框架预设：Vite
   - 构建命令：`npm run build`
   - 输出目录：`dist`
   - 环境变量：添加 `VITE_API_URL = https://你的worker地址`
5. 点部署，等 1-2 分钟

部署完成后 Cloudflare 会给你一个 `.pages.dev` 的免费域名，直接在 iPad/学习机/手机浏览器里访问即可。

---

## 后续添加新PDF内容

老师下发新 PDF 后，把 PDF 发给我（Claude），我帮你解析并追加到
`src/data/words.json` 和 `src/data/sentences.json`，然后重新 push 到 GitHub，
Cloudflare Pages 会自动重新部署。
