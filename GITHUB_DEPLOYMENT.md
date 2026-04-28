# 📤 GitHub部署指南

本项目已完成本地构建和Cloudflare配置。现在让我们将其上传到你的GitHub账户。

## 快速开始（3步）

### 步骤1: 在GitHub上创建仓库

访问 https://github.com/new 并创建新仓库：

```
Repository name: cloudflare-analytics
Description: Cloudflare日志分析和性能监控仪表板
Visibility: Public (推荐) 或 Private
Initialize: 不要选择（我们已有初始内容）
```

### 步骤2: 推送到GitHub

```bash
# 进入项目目录
cd ~/cloudflare-analytics

# 添加远程仓库（将YOUR_USERNAME替换为你的GitHub用户名）
git remote add origin https://github.com/Zhangyju/cloudflare-analytics.git

# 设置默认分支为main
git branch -M main

# 推送所有代码
git push -u origin main
```

### 步骤3: 验证

访问 https://github.com/Zhangyju/cloudflare-analytics 验证代码已上传

---

## 完整的GitHub配置（包括GitHub Actions自动部署）

### 创建GitHub Actions工作流

1. **创建目录**
```bash
mkdir -p .github/workflows
```

2. **创建自动部署工作流文件**

```bash
cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to Cloudflare

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install

    - name: Build
      run: npm run build

    - name: Deploy to Cloudflare
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      run: |
        npm install -g wrangler
        wrangler publish --env production
        wrangler pages deploy dist/pages --project-name cf-analytics
EOF
```

### 配置GitHub Secrets

1. 进入你的仓库设置：https://github.com/Zhangyju/cloudflare-analytics/settings/secrets/actions
2. 点击 "New repository secret" 并添加：

| Secret名称 | 值 |
|-----------|-----|
| `CLOUDFLARE_API_TOKEN` | `[YOUR_API_TOKEN]` |
| `CLOUDFLARE_ACCOUNT_ID` | `[YOUR_ACCOUNT_ID]` |

---

## 当前项目状态

### ✅ 已完成

- [x] 完整的项目框架搭建
- [x] 后端API实现 (Workers)
- [x] 前端仪表板 (React)
- [x] 5个功能标签页
- [x] R2存储桶配置
- [x] KV命名空间配置
- [x] 本地构建成功
- [x] Git仓库初始化
- [x] 详细的部署文档

### ⏳ 待完成（可选）

- [ ] GitHub仓库创建和推送
- [ ] 配置GitHub Actions自动部署
- [ ] 配置Logpush全量日志采集
- [ ] 部署到生产Cloudflare环境
- [ ] 配置自定义域名（可选）
- [ ] 配置告警通知（邮件/Slack）

---

## 手动部署到Cloudflare

如果你不想使用GitHub Actions，可以手动部署：

```bash
# 1. 确保已登录Cloudflare
wrangler login

# 2. 部署Workers
npm run build
wrangler publish --env production

# 3. 部署Pages
wrangler pages deploy dist/pages --project-name cf-analytics
```

---

## 后续步骤

### Day 6: 配置Logpush日志采集

1. 访问 [Cloudflare Dashboard Analytics](https://dash.cloudflare.com/?to=/:account/analytics/logpush)
2. 创建新的Logpush任务：
   - **Dataset**: HTTP Requests
   - **Destination**: R2 bucket `cf-logs`
   - **Frequency**: Hourly (推荐)
   - 点击创建

3. 等待1-2小时让日志开始流入R2

### Day 7: 访问仪表板

1. 部署完成后，访问你的Pages URL
2. 查看5个标签页的数据：
   - 地理分布分析
   - P75延迟异常
   - P95严重异常
   - 时序对比分析
   - 告警规则管理

### Day 8+: 配置通知和优化

- 配置邮件告警通知
- 配置Slack Webhook集成
- 优化缓存策略
- 添加自定义指标

---

## 常见问题

### Q: 我能立即看到日志吗？
**A**: 不能。需要等待1-2小时让日志通过Logpush流入R2。

### Q: 如何验证部署成功？
**A**: 
```bash
# 查看Workers日志
wrangler tail --env production

# 查看Pages部署
wrangler pages list
```

### Q: 如何更新部署？
**A**: 只需推送到main分支，GitHub Actions会自动部署（如果配置了workflow）

---

## 项目文件汇总

```
cloudflare-analytics/
├── src/
│   ├── workers/          # 后端API (Cloudflare Workers)
│   └── components/       # React组件 (Cloudflare Pages)
├── dist/                 # 构建输出
│   ├── workers/          # Workers构建
│   └── pages/            # Pages构建（用于部署）
├── package.json          # npm依赖
├── wrangler.toml         # Cloudflare配置
├── .env                  # 环境变量（已配置）
└── docs/                 # 详细文档
```

---

## 部署清单

在推送到GitHub前，确保完成以下步骤：

- [x] 本地构建成功 (`npm run build`)
- [x] Git初始化完成
- [x] Cloudflare账户信息已配置
- [x] R2桶已创建
- [x] KV命名空间已创建
- [ ] GitHub仓库已创建
- [ ] 代码已推送到GitHub
- [ ] GitHub Actions已配置（可选）
- [ ] 生产环境已部署

---

## 获取帮助

如果遇到问题：

1. 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 详细部署指南
2. 查看 [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) 设置清单
3. 查看 [README.md](./README.md) 项目概览

---

**祝部署顺利！** 🚀

有任何问题欢迎提问。

