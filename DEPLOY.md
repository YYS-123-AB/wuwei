# 动漫番剧推荐站 - 部署教程

## 项目简介
一个功能完整的纯前端动漫番剧推荐站，支持多维度筛选、搜索、详情查看、收藏等功能。

## 技术栈
- 原生 HTML5 + CSS3 + JavaScript (ES6+)
- Vite 5.x 构建工具
- 响应式设计（支持 1200px/768px/480px 三断点）
- 暗/亮双主题自动切换
- Hash 路由（无需服务端配置）

## 本地开发

### 环境要求
- Node.js >= 18.x
- npm >= 9.x 或 pnpm/yarn

### 安装依赖
```bash
npm install
```

### 生成数据
```bash
# 从网络获取数据，失败时自动生成100部示例番剧数据
npm run fetch
```

### 启动开发服务器
```bash
npm run dev
# 或
npm start
```
访问 http://localhost:5173 即可查看网站。

### 生产构建
```bash
npm run build
```
构建产物将输出到 `dist/` 目录。

### 本地预览构建结果
```bash
npm run preview
```

## 部署到 GitHub Pages

### 方法一：自动部署（推荐）

1. 创建 GitHub 仓库并推送代码：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

2. 开启 GitHub Pages：
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"
   - 保存设置

3. 推送代码后，GitHub Actions 会自动：
   - 安装依赖
   - 生成番剧数据
   - 构建项目
   - 部署到 GitHub Pages

4. 查看部署状态：
   - 进入仓库 Actions 标签页
   - 找到最新的 "Deploy to GitHub Pages" 工作流
   - 等待所有 Job 完成（Build → Deploy → Verify）

5. 访问地址：
   - `https://你的用户名.github.io/仓库名/`

### 方法二：手动部署

1. 构建项目：
```bash
npm run build
```

2. 将 `dist/` 目录内容推送到 `gh-pages` 分支：
```bash
# 安装 gh-pages 工具
npm install -g gh-pages

# 部署
gh-pages -d dist
```

或手动操作：
```bash
# 创建 gh-pages 分支
git checkout --orphan gh-pages

# 复制 dist 内容
cp -r dist/* .

# 提交并推送
git add .
git commit -m "Deploy"
git push origin gh-pages

# 切回主分支
git checkout main
```

## 部署到 Vercel

1. 登录 [vercel.com](https://vercel.com)
2. 点击 "New Project" 导入 GitHub 仓库
3. 配置：
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. 点击 "Deploy"

## 部署到 Netlify

1. 登录 [netlify.com](https://netlify.com)
2. "Add new site" → "Import an existing project"
3. 连接 GitHub 并选择仓库
4. 配置：
   - Build command: `npm run build`
   - Publish directory: `dist`
5. 点击 "Deploy site"

## 部署到 Cloudflare Pages

1. 登录 Cloudflare Dashboard → Pages
2. "Create a project" → "Connect to Git"
3. 选择 GitHub 仓库
4. 配置：
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 点击 "Save and Deploy"

## 部署到任何静态服务器

将 `dist/` 目录中的所有文件上传到服务器根目录即可。由于使用 Hash 路由（`#/anime/1`），无需配置 URL 重写。

### Nginx 示例配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/anime-site;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 常见问题

### 1. GitHub Pages 部署后 404？
- 确认已在 Settings → Pages 中选择 Source 为 "GitHub Actions"
- 确认 Actions 工作流执行成功（绿色对勾）
- 等待 1-5 分钟让 CDN 生效
- 检查仓库名是否包含中文或特殊字符（建议使用英文）

### 2. 页面空白？
- 打开浏览器 F12 控制台查看错误
- 检查 data/data.json 文件是否存在且格式正确
- 检查 vite.config.js 中 base 路径是否正确（GitHub Pages 需要仓库名）

### 3. 图片加载失败？
- 本项目使用 picsum.photos 作为占位图，需确保网络正常
- picsum 被墙时可替换为其他图片服务

### 4. 收藏功能不工作？
- 收藏数据存储在 localStorage 中
- 清除浏览器数据会导致收藏丢失
- 隐私模式下 localStorage 可能受限

### 5. 如何自定义番剧数据？
- 直接编辑 `data/data.json` 文件
- 或修改 `scripts/fetch-data.js` 中的生成逻辑
- 运行 `npm run fetch` 重新生成

## 文件结构说明
```
web24/
├── index.html              # 主页面（入口）
├── css/
│   └── style.css          # 全部样式（双主题+响应式）
├── js/
│   └── app.js             # 核心逻辑（筛选/搜索/路由）
├── data/
│   └── data.json          # 100部番剧数据
├── scripts/
│   └── fetch-data.js      # 数据生成脚本
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions 部署配置
├── vite.config.js         # Vite 配置
├── package.json           # 项目配置
├── .nojekyll              # 禁用 Jekyll（GitHub Pages 必需）
├── .gitignore             # Git 忽略规则
└── DEPLOY.md              # 本文件
```

## 更新数据
```bash
# 重新生成数据并构建
npm run fetch
npm run build
```

## 功能特性清单
- ✅ 三重维度 Tab 筛选（状态 × 类型 × 年份）
- ✅ 多字段搜索（番名/原版名/制作公司/导演/声优/原作/标签）
- ✅ 6 种排序方式
- ✅ 番剧卡片（封面/双名/评分/热度/状态/集数/制作公司）
- ✅ Hash 路由详情弹窗（#/anime/id）
- ✅ 详情页 4 Tab 切换（剧情/角色/STAFF/声优）
- ✅ 相关推荐（同类型/同季度/同制作公司）
- ✅ 评分分布可视化（1-5星条形图）
- ✅ 暗/亮主题切换（localStorage + 系统偏好）
- ✅ 收藏夹（localStorage 持久化）
- ✅ 响应式三断点（1200/768/480px）
- ✅ 300ms 防抖搜索
- ✅ 回到顶部按钮
- ✅ 空/加载/错误状态展示
- ✅ 弹窗三关闭方式（×按钮/遮罩点击/Esc键）
