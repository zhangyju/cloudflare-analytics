# 📊 Cloudflare Analytics Dashboard

一个功能强大的Cloudflare日志分析和性能监控仪表板，帮助你深入了解网站性能和用户地理分布。

## ✨ 主要特性

### 🌍 **地理分布分析标签页**
- 按国家和地域统计请求分布
- 展示关键性能指标：响应时间、缓存命中率、Argo使用率
- 交互式地理表格，支持过滤和排序
- 响应时间分布直方图

### ⚠️ **P75 异常分析标签页**
- 识别超过P75分位数(75%)的慢请求
- 展示影响地域和具体请求详情
- 性能瓶颈识别
- 缓存和Argo使用情况分析

### 🚨 **P95 严重异常标签页**
- 关注最严重的性能问题(95%分位数)
- 自动根本原因分析(RCA)
- 影响范围评估
- 优化建议

### 📈 **时序对比分析标签页**
- 今天 vs 昨天 vs 周均值 vs 月均值对比
- 环比/周环比/月环比增长率分析
- 时序趋势可视化
- 缓存命中率对比

### 🔔 **告警规则管理标签页**
- 创建自定义告警规则
- 支持多种条件和操作符
- 灵活的阈值设置
- 规则启用/禁用切换
- 未来支持：邮件、Slack通知集成

## 🚀 快速开始

### 前置要求
- Node.js 16+
- Cloudflare 账户
- 已解析的域名

### 1. 安装依赖

```bash
cd ~/cloudflare-analytics
npm install
```

### 2. 配置 wrangler.toml

编辑 `wrangler.toml`，填入：
```toml
account_id = "YOUR_ACCOUNT_ID"
```

### 3. 本地开发

```bash
npm run dev
# 打开 http://localhost:3000
```

### 4. 部署

```bash
# 构建
npm run build

# 部署到Cloudflare
npm run deploy
```

详见 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整部署指南。

---

## 📐 架构设计

```
┌─────────────────────────────────────────┐
│  Cloudflare Pages (React前端)           │
│  - 5个标签页仪表板                       │
│  - 实时数据刷新                         │
│  - ECharts可视化                        │
└──────────────┬──────────────────────────┘
               │ HTTP/HTTPS
               ↓
┌─────────────────────────────────────────┐
│  Cloudflare Workers (Node.js后端)       │
│  - 日志查询API                          │
│  - 数据聚合和计算                       │
│  - KV缓存管理                           │
│  - 告警规则引擎                         │
└──────────────┬──────────────────────────┘
               │
               ├──→ ┌──────────────────┐
               │    │ R2 Storage       │
               │    │ (日志文件)        │
               │    └──────────────────┘
               │
               └──→ ┌──────────────────┐
                    │ KV Namespace     │
                    │ (缓存和规则)      │
                    └──────────────────┘
```

---

## 🎯 API 端点

### 日志查询
```bash
POST /api/logs/query
Content-Type: application/json

{
  "startTime": 1704067200000,
  "endTime": 1704153600000,
  "filters": {
    "country": "CN",
    "cacheStatus": "HIT"
  },
  "limit": 1000
}
```

### 分析聚合
```bash
GET /api/analytics/geo?startTime=...&endTime=...
GET /api/analytics/stats?startTime=...&endTime=...
GET /api/analytics/percentile?startTime=...&endTime=...
```

### 时序对比
```bash
GET /api/comparison/metrics?startTime=...&endTime=...
GET /api/comparison/timeseries?startTime=...&endTime=...
```

### 告警规则
```bash
GET /api/alerts/rules                    # 获取所有规则
POST /api/alerts/rules                   # 创建规则
PUT /api/alerts/rules/{id}              # 更新规则
DELETE /api/alerts/rules/{id}           # 删除规则
```

---

## 📊 数据指标说明

| 指标 | 说明 | 单位 |
|------|------|------|
| **Origin Response Time** | 源站响应时间 | ms |
| **Edge Response Time** | 边缘节点响应时间 | ms |
| **Cache Hit Ratio** | 缓存命中率 | % |
| **Argo Smart Routing** | 是否使用了Argo智能路由 | bool |
| **P50/P75/P95/P99** | 分位数响应时间 | ms |
| **HTTP Status** | HTTP响应状态码 | 200-599 |

---

## 🎨 UI 技术栈

- **React 18** - UI框架
- **TailwindCSS** - 样式框架
- **ECharts** - 数据可视化
- **React Query** - 数据获取和缓存
- **Zustand** - 状态管理
- **Lucide React** - 图标库

---

## 🔧 后端技术栈

- **Cloudflare Workers** - 边缘计算
- **itty-router** - 轻量级路由器
- **TypeScript** - 类型安全
- **Cloudflare KV** - 分布式缓存
- **Cloudflare R2** - 对象存储

---

## 📈 使用场景

### 1. 性能监控
实时监控网站性能，快速发现性能瓶颈。

### 2. 地域优化
分析不同地域用户的访问体验，针对性优化。

### 3. 缓存策略优化
查看缓存命中率，优化缓存策略。

### 4. CDN路由优化
使用Argo Smart Routing，自动选择最优路由。

### 5. 告警和及时响应
设置告警规则，及时发现异常并响应。

---

## 🔐 安全性

- 支持API认证（Bearer Token）
- 支持IP白名单
- R2数据加密
- HTTPS加密传输

详见 [DEPLOYMENT.md](./DEPLOYMENT.md) 的安全最佳实践部分。

---

## 💰 成本优化

该方案充分利用Cloudflare的免费和便宜配额：
- Workers: 100K请求/天免费
- R2: 前10GB免费
- KV: 前100K操作/天免费
- Pages: 完全免费

预估月成本: **$5-20** (根据流量)

---

## 🐛 常见问题

### Q: 日志数据何时开始显示？
**A:** 配置Logpush后需要1-2小时日志才会开始流入R2，需要耐心等待。

### Q: 如何减少成本？
**A:** 
1. 使用Hourly而不是Real-time Logpush
2. 在R2中设置生命周期规则删除旧日志
3. 使用KV缓存减少重复查询

### Q: 支持哪些日志字段？
**A:** 支持Cloudflare HTTP Requests数据集的所有字段，详见LogService中的CloudflareLog接口。

### Q: 如何添加自定义指标？
**A:** 编辑 `src/workers/services/analytics.ts` 的聚合函数即可。

---

## 📚 文档

- [部署指南](./DEPLOYMENT.md) - 完整的部署步骤和故障排查
- [API文档](./API.md) - API详细文档（待编写）
- [架构设计](./ARCHITECTURE.md) - 架构和扩展指南（待编写）

---

## 🤝 贡献

欢迎提交Issue和PR改进这个项目。

---

## 📄 许可证

MIT

---

## 🙋 支持

遇到问题？
1. 检查 [DEPLOYMENT.md](./DEPLOYMENT.md) 的故障排查部分
2. 查看Workers日志: `wrangler tail`
3. 检查浏览器控制台错误信息

---

**祝你使用愉快！** 🎉

如有任何问题，欢迎反馈！
