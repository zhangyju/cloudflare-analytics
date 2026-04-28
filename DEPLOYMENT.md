# Cloudflare Analytics 部署指南

## 📋 目录
1. [前置要求](#前置要求)
2. [初始设置](#初始设置)
3. [Cloudflare配置](#cloudflare配置)
4. [日志采集配置](#日志采集配置)
5. [部署步骤](#部署步骤)
6. [验证与测试](#验证与测试)
7. [故障排查](#故障排查)

---

## 前置要求

- Node.js 16+ 和 npm/pnpm
- Cloudflare 账户（付费账户可访问更多功能）
- 一个已解析的域名（用于绑定Workers和Pages）
- 基础的命令行知识

---

## 初始设置

### 1. 安装依赖

```bash
cd ~/cloudflare-analytics
npm install
# 或
pnpm install
```

### 2. 验证文件结构

```
cloudflare-analytics/
├── src/
│   ├── workers/
│   │   ├── index.ts (入口点)
│   │   ├── handlers/
│   │   │   ├── logQuery.ts
│   │   │   ├── analytics.ts
│   │   │   ├── alerts.ts
│   │   │   └── comparison.ts
│   │   └── services/
│   │       ├── logService.ts
│   │       └── analytics.ts
│   ├── components/
│   │   ├── tabs/
│   │   │   ├── GeoAnalyticsTab.tsx
│   │   │   ├── P75AnalyticsTab.tsx
│   │   │   ├── P95AnalyticsTab.tsx
│   │   │   ├── ComparisonTab.tsx
│   │   │   └── AlertsTab.tsx
│   │   ├── ui/
│   │   ├── charts/
│   │   └── *.tsx (其他组件)
│   ├── store/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── wrangler.toml
└── DEPLOYMENT.md
```

---

## Cloudflare 配置

### 步骤1: 获取账户信息

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在右下角找到"账户ID"
3. 创建 API Token：
   - Settings → API tokens → Create Token
   - 选择"Custom token"
   - 设置权限：`Account.Cloudflare Workers Tail Read`, `Zone.Firewall`等
   - 记下token值

### 步骤2: 认证wrangler

```bash
npm install -g @cloudflare/wrangler
wrangler login
# 或使用API Token
wrangler login --scopes account:read
```

### 步骤3: 更新 wrangler.toml

编辑 `wrangler.toml` 文件，填入你的账户信息：

```toml
name = "cf-analytics"
account_id = "YOUR_ACCOUNT_ID"  # 从dashboard获取
workers_dev = true

# R2 bucket 配置
[[r2_buckets]]
binding = "LOGS_BUCKET"
bucket_name = "cf-logs"

# KV 命名空间配置
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID"

# 生产环境配置
[env.production]
routes = [
  { pattern = "analytics.example.com/*", zone_id = "YOUR_ZONE_ID" }
]

[env.development]
routes = [
  { pattern = "localhost:8787/*" }
]
```

---

## 日志采集配置

### 步骤1: 创建R2存储桶

```bash
# 使用wrangler创建R2桶
wrangler r2 bucket create cf-logs

# 验证创建
wrangler r2 bucket list
```

### 步骤2: 配置Logpush

在Cloudflare Dashboard中：

1. 进入 **Analytics & Logs** → **Logpush**
2. 点击 **Create a Logpush Job**
3. 配置：
   - **Dataset**: HTTP Requests (包含所有需要的数据)
   - **Frequency**: Real-time 或 Hourly (推荐Hourly以节省成本)
   - **Destination**: R2 Bucket: `cf-logs`
   - **Filter** (可选): 添加过滤条件减少数据量
4. 点击 **Create Logpush Job**

### 步骤3: 验证日志流入

等待1-2小时让日志开始流入，然后：

```bash
# 查看R2中的日志
wrangler r2 object list --bucket=cf-logs
```

期望看到类似的目录结构：
```
logs/20240101/00/
logs/20240101/01/
...
```

### 日志格式参考

单条日志示例 (JSON):
```json
{
  "timestamp": 1704067200,
  "clientCountry": "CN",
  "clientIP": "192.0.2.1",
  "cacheStatus": "HIT",
  "originResponseTime": 250,
  "edgeResponseTime": 150,
  "httpStatus": 200,
  "edgeColoName": "SJC",
  "argoSmartRouting": true,
  "rayID": "abc123def456",
  "contentType": "text/html",
  "requestPath": "/api/users",
  "httpHost": "example.com"
}
```

---

## 部署步骤

### 步骤1: 本地开发测试

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:3000 (Pages)
# Workers API: http://localhost:8787/api/*
```

### 步骤2: 类型检查

```bash
npm run type-check
```

### 步骤3: 构建

```bash
npm run build
```

### 步骤4: 部署 Workers

```bash
# 生产环境部署
wrangler publish --env production

# 或开发环境
wrangler publish --env development
```

### 步骤5: 部署 Pages

```bash
# 自动从dist目录部署
npm run deploy

# 或手动指定目录
wrangler pages deploy dist/pages
```

### 步骤6: 绑定域名

在Cloudflare Dashboard中：

1. **Pages项目** → **Settings** → **Build & Deployments**
   - 绑定到自定义域名
2. **Workers路由** → 配置API路由
   - 设置 `analytics.example.com/api/*` 指向Workers

---

## 验证与测试

### 1. 检查Workers是否运行

```bash
# 查看最近的请求日志
wrangler tail

# 应该看到类似：
# GET /api/analytics/stats 200
# POST /api/logs/query 200
```

### 2. 测试API端点

```bash
# 测试日志查询API
curl -X POST http://localhost:8787/api/logs/query \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": '$(date -d '7 days ago' +%s000)',
    "endTime": '$(date +%s000)',
    "filters": {},
    "limit": 100
  }'

# 测试分析API
curl http://localhost:8787/api/analytics/stats?startTime=$(date -d '7 days ago' +%s000)

# 测试告警API
curl http://localhost:8787/api/alerts/rules
```

### 3. 前端页面测试

在浏览器中访问部署的URL，检查：
- [ ] 地理分布标签页加载正常
- [ ] P75延迟标签页显示异常请求
- [ ] P95异常标签页显示严重问题
- [ ] 时序对比标签页显示增长趋势
- [ ] 告警规则标签页可创建和编辑规则

---

## 环境变量配置

### 生产环境变量 (.env.production)

```env
VITE_API_BASE_URL=https://analytics.example.com
VITE_WORKERS_URL=https://api.example.com
```

### 开发环境变量 (.env.development)

```env
VITE_API_BASE_URL=http://localhost:8787
VITE_WORKERS_URL=http://localhost:8787
```

---

## 成本优化建议

1. **Logpush频率**: 使用Hourly而非Real-time（降低50-80%成本）
2. **日志保留**: 在R2中设置生命周期策略删除旧日志
3. **缓存策略**: KV设置合理的TTL避免不必要的查询
4. **数据采样**: 对高流量应用考虑采样日志

示例：R2生命周期规则

```json
{
  "Rules": [
    {
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

---

## 故障排查

### 问题1: 日志查询返回空结果

**可能原因**:
- [ ] Logpush任务未启用
- [ ] R2桶路径不匹配
- [ ] 日志还未到达R2（等待1-2小时）

**解决方案**:
```bash
# 检查Logpush状态
wrangler r2 object list --bucket=cf-logs

# 检查日期格式
# 预期: logs/YYYYMMDD/HH/
```

### 问题2: Workers 超时

**可能原因**:
- 日志文件过大
- 查询时间范围过长

**解决方案**:
- 减少`limit`参数
- 使用流式处理（logService中的`streamLogsFromR2`）
- 增加Worker超时时间（在wrangler.toml中）

### 问题3: 缓存数据过期

**可能原因**:
- KV命名空间不存在或未正确绑定

**解决方案**:
```bash
# 创建或获取KV ID
wrangler kv:namespace list

# 在wrangler.toml中更新
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID"
```

### 问题4: 前端加载缓慢

**可能原因**:
- Workers API响应慢
- 数据传输量大

**解决方案**:
1. 启用Gzip压缩
2. 实现数据分页
3. 使用Worker地域就近部署

---

## 监控和维护

### 定期检查项

```bash
# 每周检查一次
1. wrangler tail           # 查看错误日志
2. 检查R2使用量和成本
3. 验证告警规则是否触发
4. 检查缓存命中率
```

### 更新日志模式

如果Cloudflare添加新的日志字段，需要更新：
1. `src/workers/services/logService.ts` 中的 `CloudflareLog` 接口
2. 相应的分析函数
3. 前端组件显示新字段

---

## 安全最佳实践

1. **API认证**: 添加Bearer token验证
2. **速率限制**: 在Workers中实现速率限制
3. **IP白名单**: 限制API访问IP范围
4. **数据加密**: R2启用加密

示例：添加认证中间件

```typescript
// src/workers/middleware/auth.ts
export function checkAuth(req: Request): boolean {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  return token === process.env.API_TOKEN;
}
```

---

## 下一步

1. ✅ 完成部署
2. ⬜ 配置告警通知（邮件/Slack）
3. ⬜ 自定义仪表板模板
4. ⬜ 集成更多数据源
5. ⬜ 实现自动化优化建议

---

需要帮助？查看错误日志：

```bash
wrangler tail --env production
```

更新时间: 2024年
