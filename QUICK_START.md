# ⚡ 快速开始指南 (5分钟上手)

## 1️⃣ 初始化 (2分钟)

```bash
cd ~/cloudflare-analytics
npm install
```

## 2️⃣ 配置账户信息 (1分钟)

编辑 `wrangler.toml`:
```toml
account_id = "YOUR_ACCOUNT_ID"  # 从 https://dash.cloudflare.com 获取
```

## 3️⃣ 启动开发 (1分钟)

```bash
npm run dev
# 浏览器访问 http://localhost:3000
```

## 4️⃣ 部署 (1分钟)

```bash
npm run build
wrangler publish --env production
wrangler pages deploy dist/pages
```

---

## 📌 关键文件

| 文件 | 说明 |
|------|------|
| `README.md` | 项目概览 |
| `DEPLOYMENT.md` | 详细部署指南 ⭐️ |
| `SETUP_CHECKLIST.md` | 完整检查清单 |
| `wrangler.toml` | Cloudflare配置 |

---

## 🔗 核心配置

### 环境变量 (.env)
```env
VITE_API_BASE_URL=https://your-domain.com
VITE_WORKERS_URL=https://api.your-domain.com
```

### Workers路由 (wrangler.toml)
```toml
[[r2_buckets]]
binding = "LOGS_BUCKET"
bucket_name = "cf-logs"

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID"
```

---

## 📊 5大功能一览

| 标签页 | 功能 | 关键指标 |
|--------|------|---------|
| **地理分布** 🌍 | 国家/地域分布分析 | 响应时间、缓存率 |
| **P75延迟** ⚠️ | 超P75的异常请求 | 影响地域、超额比例 |
| **P95异常** 🚨 | 严重性能问题分析 | RCA、优化建议 |
| **时序对比** 📈 | 今昨周月对比 | 增长率、趋势 |
| **告警规则** 🔔 | 自定义告警配置 | 规则管理 |

---

## ✅ 预装检查清单

部署前运行：

```bash
# 1. 类型检查
npm run type-check

# 2. 构建检查
npm run build

# 3. 验证项目结构
ls -la dist/workers dist/pages

# 4. 测试API
wrangler tail
```

---

## 🆘 常见问题速查

### Q: 看不到日志数据？
```bash
# 1. 检查R2桶
wrangler r2 bucket list

# 2. 检查日志文件
wrangler r2 object list --bucket=cf-logs

# 3. 等待1-2小时让日志流入
```

### Q: API返回错误？
```bash
# 查看Workers日志
wrangler tail --env production

# 检查配置
wrangler whoami
```

### Q: 前端加载缓慢？
```bash
# 1. 检查API响应时间
curl -w "@curl-format.txt" https://your-api.workers.dev/api/stats

# 2. 减少查询范围
# 3. 检查KV缓存
```

---

## 📈 性能基准

| 操作 | 期望时间 | 阈值 |
|------|---------|------|
| 页面加载 | 1-2s | < 3s |
| API响应 | 100-500ms | < 1s |
| 日志查询 | 200-800ms | < 2s |
| 数据聚合 | 50-200ms | < 500ms |

---

## 🚀 下一步

1. **立即部署**
   - 跟随 [DEPLOYMENT.md](./DEPLOYMENT.md)
   
2. **配置告警通知**
   - 集成邮件/Slack
   
3. **优化缓存**
   - 分析命中率
   - 调整TTL
   
4. **扩展功能**
   - 添加自定义指标
   - 集成其他系统

---

## 💡 技巧

### 本地测试API
```bash
# 日志查询
curl -X POST http://localhost:8787/api/logs/query \
  -H "Content-Type: application/json" \
  -d '{"startTime": 1704067200000, "endTime": 1704153600000, "limit": 10}'

# 获取统计
curl "http://localhost:8787/api/analytics/stats?startTime=1704067200000&endTime=1704153600000"

# 获取告警规则
curl "http://localhost:8787/api/alerts/rules"
```

### 本地开发热更新
```bash
npm run dev  # 自动监听文件变化
```

### 构建优化
```bash
npm run build --production  # 生产优化构建
```

---

## 📞 获取帮助

1. 检查 [DEPLOYMENT.md](./DEPLOYMENT.md) 的**故障排查**部分
2. 查看 Workers 日志: `wrangler tail`
3. 检查浏览器 DevTools 控制台
4. 验证所有配置文件

---

**准备好了？开始部署吧！** 🎉

```bash
npm run build && npm run deploy
```
