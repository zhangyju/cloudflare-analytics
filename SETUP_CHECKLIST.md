# ✅ Cloudflare Analytics 设置检查清单

按照这个清单逐步配置你的分析仪表板。

## 第1天：基础配置

### 1.1 项目初始化
- [ ] 克隆或创建项目文件夹
- [ ] 运行 `npm install` 安装依赖
- [ ] 验证所有文件已正确创建

### 1.2 Cloudflare 账户配置
- [ ] 获取 Cloudflare 账户ID
  ```bash
  # 在 https://dash.cloudflare.com 右下角查看
  ```
- [ ] 创建 API Token
  - 访问 Settings → API tokens
  - 创建 Custom token
  - 权限：`Account.Cloudflare Workers Tail Read`
- [ ] 安装wrangler: `npm install -g @cloudflare/wrangler`
- [ ] 认证: `wrangler login`

### 1.3 更新配置文件
- [ ] 编辑 `wrangler.toml`
  ```toml
  account_id = "YOUR_ACCOUNT_ID"  # 替换为你的账户ID
  ```
- [ ] 运行类型检查: `npm run type-check`

## 第2天：R2 存储配置

### 2.1 创建 R2 桶
- [ ] 创建R2桶: `wrangler r2 bucket create cf-logs`
- [ ] 验证创建: `wrangler r2 bucket list`

### 2.2 创建 KV 命名空间
- [ ] 创建KV: `wrangler kv:namespace create CACHE`
- [ ] 获取KV ID
- [ ] 更新 `wrangler.toml` 中的KV ID

### 2.3 配置 Logpush
- [ ] 登录 Cloudflare Dashboard
- [ ] 前往 Analytics & Logs → Logpush
- [ ] 创建 Logpush Job
  - Dataset: `http_requests`
  - Frequency: `hourly` (推荐) 或 `realtime`
  - Destination: R2 bucket `cf-logs`
  - 配置过滤规则 (可选)
- [ ] 等待1-2小时让日志流入
- [ ] 验证日志: `wrangler r2 object list --bucket=cf-logs`

## 第3天：开发与测试

### 3.1 本地开发
- [ ] 启动开发服务器: `npm run dev`
- [ ] 访问前端: `http://localhost:3000`
- [ ] 检查API: `http://localhost:8787/api/alerts/rules`

### 3.2 测试核心功能
- [ ] 地理分布标签页能够加载
- [ ] P75标签页显示异常请求
- [ ] P95标签页显示严重异常
- [ ] 时序对比标签页显示趋势
- [ ] 能够创建告警规则

### 3.3 API测试
```bash
# 测试日志查询
curl -X POST http://localhost:8787/api/logs/query \
  -H "Content-Type: application/json" \
  -d '{"startTime": 1704067200000, "endTime": 1704153600000, "limit": 100}'

# 测试统计API
curl "http://localhost:8787/api/analytics/stats?startTime=1704067200000&endTime=1704153600000"

# 测试告警API
curl "http://localhost:8787/api/alerts/rules"
```

## 第4天：生产部署

### 4.1 构建
- [ ] 运行: `npm run build`
- [ ] 验证生成 `dist/workers` 和 `dist/pages`

### 4.2 部署 Workers
- [ ] 部署: `wrangler publish --env production`
- [ ] 获取Workers URL (通常是 `cf-analytics.xxx.workers.dev`)

### 4.3 部署 Pages
- [ ] 部署: `wrangler pages deploy dist/pages`
- [ ] 获取Pages URL

### 4.4 绑定域名 (可选)
- [ ] 前往 Cloudflare Dashboard
- [ ] Pages项目 → Settings → Build & Deployments
- [ ] 添加自定义域名 (例如: `analytics.example.com`)
- [ ] 配置Workers路由 (例如: `analytics.example.com/api/*`)

## 第5天：验证与优化

### 5.1 生产环境验证
- [ ] 访问部署的URL
- [ ] 测试所有5个标签页加载
- [ ] 查看实际的日志数据
- [ ] 测试日期范围选择器
- [ ] 验证数据更新

### 5.2 性能检查
- [ ] 检查页面加载时间 (应该 < 2s)
- [ ] 检查API响应时间 (应该 < 1s)
- [ ] 验证缓存工作正常

### 5.3 监控日志
- [ ] 查看Workers日志: `wrangler tail --env production`
- [ ] 检查是否有错误信息
- [ ] 验证API被正确调用

### 5.4 成本监控
- [ ] 检查R2使用量: `wrangler r2 bucket info --bucket=cf-logs`
- [ ] 监控KV操作数
- [ ] 估算月成本

## 常见问题排查

### 症状：看不到日志数据
**检查清单：**
- [ ] Logpush任务已启用且运行中
- [ ] 至少等待了1-2小时
- [ ] R2桶中确实有日志文件: `wrangler r2 object list --bucket=cf-logs`
- [ ] 日期范围与日志时间匹配

### 症状：API返回错误
**检查清单：**
- [ ] Workers已成功部署: `wrangler tail`
- [ ] R2桶权限正确配置
- [ ] KV命名空间已创建和绑定
- [ ] 检查wrangler.toml中的配置

### 症状：前端加载缓慢
**检查清单：**
- [ ] 网络连接正常
- [ ] API服务正常运行
- [ ] 数据集不要过大（默认limit=10000）
- [ ] 浏览器开发者工具检查网络请求

## 配置验证命令

一次性验证所有配置：

```bash
# 1. 检查wrangler配置
wrangler whoami

# 2. 检查R2桶
wrangler r2 bucket list

# 3. 检查KV命名空间
wrangler kv:namespace list

# 4. 检查Logpush任务
curl -X GET https://api.cloudflare.com/client/v4/zones/{zone_id}/logpush/jobs \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. 检查日志文件
wrangler r2 object list --bucket=cf-logs | head -20
```

## 配置参考

### 最小化配置（免费方案）
```
日志保留: 7天
Logpush频率: Hourly
查询限制: 1000条/次
缓存TTL: 5分钟
```

### 标准配置（月成本$5-10）
```
日志保留: 30天
Logpush频率: Hourly
查询限制: 10000条/次
缓存TTL: 1小时
```

### 企业配置（月成本$20+）
```
日志保留: 90天
Logpush频率: Real-time
查询限制: 100000条/次
缓存TTL: 30分钟
预计算统计数据
```

## 下一步行动

部署完成后：

1. **配置告警通知**
   - 集成邮件发送
   - 集成Slack Webhooks
   - 配置PagerDuty

2. **优化缓存策略**
   - 分析缓存命中率
   - 调整过期时间
   - 优化查询条件

3. **自定义仪表板**
   - 添加更多指标
   - 创建自定义报表
   - 导出功能

4. **建立报警规则库**
   - P50/P75/P95/P99组合
   - 缓存命中率规则
   - 地域性能规则

5. **集成其他系统**
   - 连接到BI工具
   - 与监控系统集成
   - 数据导出API

---

**完成所有步骤后，你就拥有了一个功能完整的Cloudflare性能分析仪表板！** 🎉

需要帮助? 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细说明。
