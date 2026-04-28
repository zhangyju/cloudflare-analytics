# 演示数据功能说明

## 概述

由于你的 Zone 是测试用的，没有真实的 HTTP 流量，R2 中没有 Logpush 采集的日志。为了让你能够立即看到仪表板的所有功能工作，我们添加了一个**自动演示数据生成器**。

## 数据源

### 优先级顺序

1. **真实数据** (优先): 当 R2 中有真实的 Logpush 日志时，使用真实数据
2. **演示数据** (备选): 当 R2 中没有日志时，自动生成并使用演示数据

## 演示数据特性

### 包含的字段

每条日志包含完整的 HTTP 请求信息：

```
{
  "timestamp": 1714302600000,           // 请求时间戳
  "clientCountry": "US",                 // 客户端国家 (12个国家随机)
  "clientIP": "192.168.1.1",            // 客户端 IP
  "cacheStatus": "HIT",                  // 缓存状态 (HIT/MISS/EXPIRED/BYPASS)
  "originResponseTime": 1234,            // 源站响应时间 (ms)
  "edgeResponseTime": 567,               // 边缘节点响应时间 (ms)
  "rayID": "ray7a9b2c",                 // Cloudflare 请求 ID
  "httpStatus": 200,                     // HTTP 状态码
  "httpMethod": "GET",                   // HTTP 方法
  "httpUserAgent": "Mozilla/5.0...",     // User Agent
  "contentType": "application/json",     // 内容类型
  "country": "US",                       // 国家
  "httpHost": "analytics.example.com",  // 主机名
  "httpProtocol": "HTTP/2",             // HTTP 版本
  "tlsVersion": "TLSv1.3"                // TLS 版本
}
```

### 数据模式

- **时间范围**: 最近 1 小时
- **日志数量**: 1000 条日志
- **国家分布**: US, CN, GB, DE, JP, IN, BR, FR, CA, AU, SG, KR (12个国家)
- **响应时间**: 
  - 普通请求: 0-2000ms
  - 偶尔慢请求: 最多 7000ms (20% 概率)
- **缓存命中率**: 25% HIT, 25% MISS, 25% EXPIRED, 25% BYPASS
- **HTTP 状态码**: 200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500, 502, 503

## 使用场景

### 场景 1: 生产环境（真实网站）

```
真实 Zone 流量
    ↓
Logpush Job 采集
    ↓
R2 存储日志
    ↓
API 查询日志
    ↓
仪表板显示真实分析
```

状态: 当 R2 中有日志时自动使用真实数据

### 场景 2: 测试环境（你的情况）

```
Zone 无流量
    ↓
Logpush 无日志
    ↓
R2 为空
    ↓
API 自动生成演示数据
    ↓
仪表板显示演示数据
```

状态: 当 R2 为空时自动启用演示数据

## 功能验证

通过演示数据，你可以验证以下功能：

### ✅ 地理分布分析

- 12 个国家的请求分布
- 按国家统计的响应时间
- 按国家统计的缓存命中率
- 交互式国家过滤

### ✅ P75 异常检测

- 识别超过 P75 分位数的慢请求
- 显示地理位置分布
- 显示缓存状态

### ✅ P95 严重问题

- 识别最慢的 5% 请求
- 自动生成根本原因分析
- 建议优化方案
- 显示影响的地理区域

### ✅ 时序对比分析

- 今天 vs 昨天 vs 本周 vs 本月
- 增长率计算
- 响应时间趋势
- 缓存命中率变化

### ✅ 告警规则管理

- 创建自定义告警规则
- 配置阈值
- 启用/禁用规则

## 如何切换到真实数据

### 步骤 1: 确认你的 Zone 有真实流量

访问你的网站或 API，产生实际的 HTTP 请求。

### 步骤 2: 等待 Logpush 采集

Logpush Job (ID: 1609088) 会每小时自动采集日志。首次采集可能需要 1-2 小时。

### 步骤 3: 查看仪表板

一旦 R2 中有日志，API 会自动从真实日志而不是演示数据读取：

```
API 流程:
1. 查询 R2 中的日志
2. 如果找到 → 返回真实数据
3. 如果未找到 → 返回演示数据
```

### 步骤 4: 监控 R2 存储桶

在 Cloudflare Dashboard 中：

```
R2 → cf-logs → zone-logs → YYYYMMDD/HH/
```

你会看到每小时生成的日志文件。

## 配置选项

### 强制使用演示数据

如果你想强制使用演示数据（即使 R2 中有真实日志），可以发送：

```bash
curl -X POST https://cf-analytics-production.my-works.workers.dev/api/logs/query \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": 1714300000000,
    "endTime": 1714306000000,
    "useDemo": true
  }'
```

## 技术细节

### 演示数据生成函数

位置: `src/workers/services/logService.ts`

```typescript
export function generateDemoLogs(count: number = 1000): CloudflareLog[]
```

功能:
- 生成指定数量的演示日志
- 包含随机的地理位置、响应时间等
- 模拟真实的 Cloudflare 日志格式

### 自动回退逻辑

位置: `src/workers/handlers/logQuery.ts`

```typescript
// 如果 R2 查询返回空结果，自动使用演示数据
if (logs.length === 0) {
  console.log('No logs found in R2, using demo logs');
  logs = generateDemoLogs(1000);
}
```

## 常见问题

### Q: 演示数据会影响分析的准确性吗？

A: 演示数据只是用来验证仪表板功能是否正常工作。一旦有真实数据，API 会自动切换到真实日志进行分析。

### Q: 如何知道当前使用的是演示数据还是真实数据？

A: 查看 Workers 日志:

```bash
export CLOUDFLARE_API_TOKEN="[YOUR_TOKEN]"
wrangler tail --env production
```

如果看到 "Using demo logs" 或 "No logs found in R2, using demo logs"，说明使用的是演示数据。

### Q: 演示数据会每次刷新都改变吗？

A: 是的，每次查询都会生成新的随机演示数据。这模拟了真实的 HTTP 请求随机性。

### Q: 可以禁用演示数据吗？

A: 可以，你可以修改代码：

```typescript
// 在 logQuery.ts 中注释掉回退逻辑
// if (logs.length === 0) {
//   logs = generateDemoLogs(1000);
// }
```

然后重新部署。

## 下一步

### 当你准备使用真实数据时：

1. 在你的 Cloudflare Zone 上配置真实的域名和 DNS
2. 向你的 Zone 发送 HTTP 流量
3. Logpush 会自动采集日志到 R2
4. 仪表板会自动显示真实数据

### 在此之前：

1. 使用演示数据验证所有仪表板功能
2. 测试告警规则
3. 熟悉各个分析标签
4. 确认部署没有问题

---

**当前状态**: 自动演示数据已启用 ✅

**部署版本**: b0197fe (Add demo data generator)

**最后更新**: 2026-04-28

