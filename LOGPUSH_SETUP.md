# 📋 Logpush 配置指南

## 目标
配置 Cloudflare Logpush，将 HTTP 请求日志自动导入到 R2 存储桶，为仪表板提供数据。

## 📋 前置条件
- ✅ R2 存储桶已创建：`cf-logs`
- ✅ Cloudflare 账户访问权限
- ✅ 账户 ID：`e0914bbf92140660c12e968524e43a8a`

---

## 🚀 配置步骤

### 步骤 1: 访问 Logpush 仪表板

打开你的浏览器，访问：
```
https://dash.cloudflare.com/?to=/:account/analytics/logpush
```

如果上面的链接不工作，按以下步骤：
1. 进入 https://dash.cloudflare.com
2. 选择你的账户
3. 在左侧菜单找到 **"Analytics"**
4. 点击 **"Logpush"**

### 步骤 2: 创建 Logpush 任务

1. 点击 **"Create Logpush Job"** 按钮
2. 在弹出的表单中填写：

| 字段 | 值 | 说明 |
|------|-----|------|
| **Dataset** | HTTP Requests | 选择 HTTP 请求日志 |
| **Frequency** | Low | 推荐每小时一次（节省成本） |
| **Destination** | R2 | 选择 R2 作为目标存储 |
| **Bucket** | cf-logs | 选择你创建的存储桶 |

### 步骤 3: 配置日志字段

当提示选择日志字段时，确保包含以下字段（最少要求）：

**必需字段：**
- `Timestamp` - 请求时间戳
- `RayID` - Cloudflare 请求 ID
- `Country` - 请求来源国家
- `EdgeResponseStatus` - 边缘节点响应状态
- `OriginResponseStatus` - 源站响应状态
- `RequestHost` - 请求主机名
- `RequestMethod` - HTTP 方法
- `RequestPath` - 请求路径
- `EdgeResponseTime` - 边缘节点响应时间
- `OriginResponseTime` - 源站响应时间
- `CacheCacheStatus` - 缓存状态

**可选字段（推荐）：**
- `ClientIP` - 客户端 IP
- `ClientCountry` - 客户端国家
- `RequestUserAgent` - User Agent
- `ResponseContentType` - 响应内容类型

### 步骤 4: 允许凭证创建

Cloudflare 会自动为你创建必要的 R2 凭证。你会看到一条确认消息。

### 步骤 5: 完成设置

1. 审查所有设置
2. 点击 **"Create Job"** 或 **"Enable"** 按钮
3. 等待确认消息

---

## ✅ 验证设置

### 检查 1: 任务已启用

在 Logpush 仪表板中，你应该看到新的 HTTP Requests 任务，状态为 **"Enabled"**。

### 检查 2: 等待日志流入

Logpush 需要 **1-2 小时**才能开始处理和导出日志。这取决于：
- 你的网站流量
- Cloudflare 的处理时间
- 日志批处理间隔

### 检查 3: 检查 R2 存储桶

1. 进入 Cloudflare 仪表板
2. 左侧菜单选择 **"R2"**
3. 点击 **"cf-logs"** 存储桶
4. 查找格式如下的文件夹：
   ```
   /logs/YYYYMMDD/HH/
   ```
   例如：`/logs/20260428/12/`

### 检查 4: 访问仪表板

一旦日志开始流入，访问你的仪表板：
```
https://86b1a7b3.cf-analytics.pages.dev
```

应该看到数据在各个标签页中显示：
- 🌍 地理分布分析
- ⚠️ P75 异常检测
- 🚨 P95 严重问题
- 📈 时序对比
- 🔔 告警规则

---

## 🔧 高级配置（可选）

### 自定义日志位置

如果你想更改 R2 中的日志位置，在创建 Logpush 任务时：

1. 点击 **"Advanced Settings"**
2. 修改目标路径（示例）：
   ```
   cf-logs/http-logs/YYYY/MM/DD/HH/
   ```

### 更改频率

如果需要更频繁的日志导出：
- **High**: 每 30 分钟一次（成本更高）
- **Low**: 每小时一次（推荐，成本低）

### 禁用任务

如果需要暂停日志收集：
1. 在 Logpush 仪表板找到任务
2. 点击 **"Disable"**
3. 日志收集将停止，但已有日志保留在 R2 中

---

## 📊 预期日志格式

日志会以 JSON 格式存储在 R2 中，每个文件包含一小时的日志。

示例日志条目：
```json
{
  "Timestamp": "2026-04-28T12:34:56Z",
  "RayID": "abc123def456ghi789",
  "Country": "US",
  "EdgeResponseStatus": 200,
  "OriginResponseStatus": 200,
  "EdgeResponseTime": 45,
  "OriginResponseTime": 200,
  "RequestHost": "example.com",
  "RequestMethod": "GET",
  "RequestPath": "/api/data",
  "CacheCacheStatus": "HIT"
}
```

---

## 💰 成本影响

Logpush 每个 HTTP 请求日志记录产生费用：
- **$0.50 per 100,000 requests** (HTTP Request Logs)
- 日志导出频率不影响费用（按请求数计）

例如：
- 100万请求/天 = 约 $15/月
- 100K请求/天 = 约 $1.50/月
- 10K请求/天 = 约 $0.15/月

---

## 🐛 故障排查

### 问题 1: 任务显示 "Failed"

**原因**: R2 凭证问题

**解决方案**:
1. 删除失败的任务
2. 重新创建任务
3. 确保 R2 存储桶 `cf-logs` 存在
4. 确保账户有权限访问 R2

### 问题 2: 一小时后仍无日志

**原因**: 可能需要更多时间或没有流量

**解决方案**:
1. 确保你的网站/API 有流量（通过浏览器访问一些页面）
2. 等待更长时间（可能需要 2-4 小时首次导出）
3. 检查 Logpush 任务状态（应为 "Enabled"）
4. 查看 R2 存储桶是否有任何新文件

### 问题 3: 仪表板仍显示 "无数据"

**原因**: API 可能需要重新连接

**解决方案**:
1. 刷新仪表板页面
2. 等待 KV 缓存过期（5分钟）
3. 查看浏览器开发者工具中的网络错误
4. 检查 Workers API 日志：
   ```bash
   export CLOUDFLARE_API_TOKEN="[YOUR_API_TOKEN]"
   wrangler tail --env production
   ```

---

## 📞 获取帮助

如果遇到问题：

1. **检查 Cloudflare 仪表板**:
   - Logpush 任务状态
   - R2 存储桶内容
   - 账户配额和额度

2. **查看日志**:
   ```bash
   export CLOUDFLARE_API_TOKEN="[YOUR_API_TOKEN]"
   wrangler tail --env production
   ```

3. **检查 GitHub**:
   https://github.com/zhangyju/cloudflare-analytics/issues

4. **查看文档**:
   - `DEPLOYMENT_COMPLETE.md` - 部署状态
   - `README.md` - 项目概览
   - `DEPLOYMENT.md` - 详细部署指南

---

## ✨ 完成！

一旦日志开始流入，你的仪表板将自动填充数据。

**下一步**:
1. 完成上述步骤
2. 等待 1-2 小时日志流入
3. 访问 https://86b1a7b3.cf-analytics.pages.dev 查看数据
4. 在仪表板中创建自定义告警规则

享受你的实时分析仪表板！ 🚀
