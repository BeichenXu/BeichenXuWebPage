# Cloudflare Pages 部署指南

## 方式一：通过 Git 连接（推荐）

### 1. 初始化 Git 并推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/BeichenXuWeb.git
git push -u origin main
```

### 2. 在 Cloudflare 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单选择 **Workers & Pages**
3. 点击 **Create** → **Pages** → **Connect to Git**
4. 选择 **GitHub**，授权 Cloudflare 访问你的仓库
5. 选择仓库 `BeichenXuWeb`

### 3. 配置构建设置（静态站点）

| 设置项 | 值 |
|--------|-----|
| **Framework preset** | None |
| **Build command** | （留空） |
| **Build output directory** | `/` 或 `.` |

### 4. 部署

点击 **Save and Deploy**，等待 1–2 分钟即可完成部署。

---

## 方式二：直接上传（无需 Git）

### 1. 打包文件

将 `index.html`、`style.css`、`wrangler.toml` 放在同一文件夹，或打成 zip。

### 2. 上传到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. **Workers & Pages** → **Create** → **Pages**
3. 选择 **Upload assets**
4. 拖拽文件夹或上传 zip 文件

---

## 绑定 GoDaddy 自定义域名

### 1. 在 Cloudflare Pages 添加域名

1. 进入你的 Pages 项目 → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名（如 `yourdomain.com`）

### 2. 在 GoDaddy 修改 DNS

1. 登录 [GoDaddy](https://godaddy.com) → **我的产品** → 域名 → **DNS 管理**
2. 添加/修改以下记录（按 Cloudflare 提示的 IP 和 CNAME 填写）：

| 类型 | 名称 | 值 | TTL |
|------|------|-----|-----|
| CNAME | www | `你的项目.pages.dev` | 1 小时 |
| A | @ | `Cloudflare 提供的 IP` | 1 小时 |

> Cloudflare 添加自定义域名时会显示需要填写的具体值。

---

## 后续更新

**Git 方式**：修改代码后 `git push`，会自动重新部署。

**上传方式**：重新上传文件覆盖即可。
