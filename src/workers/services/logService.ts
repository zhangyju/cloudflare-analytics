/**
 * 从R2存储日志的服务
 * 日志格式: /logs/{date}/{hour}/{request_id}.json
 */

interface CloudflareLog {
  timestamp: number;
  clientCountry: string;
  clientIP: string;
  cacheStatus: 'HIT' | 'MISS' | 'EXPIRED' | 'BYPASS';
  originResponseTime: number;
  edgeResponseTime: number;
  cacheKeyPrefix?: string;
  cacheRespHeaders?: string;
  cacheTagsHeaders?: string;
  clientTcpRtt?: number;
  clientSSLProtocol?: string;
  clientSSLCipher?: string;
  clientDeviceType?: string;
  contentType?: string;
  country?: string;
  httpHost?: string;
  httpMethod?: string;
  httpProtocol?: string;
  httpStatus?: number;
  httpUserAgent?: string;
  originIp?: string;
  originSSLProtocol?: string;
  originSSLCipher?: string;
  originResponseContentLength?: number;
  rangeStart?: number;
  rangeEnd?: number;
  rayID?: string;
  requestSize?: number;
  responseSize?: number;
  rocketLoaderError?: string;
  smartRouteColoCode?: string;
  smartRouteColoId?: string;
  smartRouteColoName?: string;
  tlsVersion?: string;
  tlsCipher?: string;
  tlsClientAuth?: string;
  edgeColoCode?: string;
  edgeColoId?: number;
  edgeColoName?: string;
  edgeRequestHost?: string;
  edgeRateLimitAction?: string;
  edgeRateLimitID?: number;
  edgeRequestProtocol?: string;
  zoneID?: number;
  zoneName?: string;
  workerCPUMs?: number;
  workerStatus?: string;
  workerSubrequests?: number;
  workerWallTimeMs?: number;
  requestPath?: string;
  requestQuery?: string;
  requestReferer?: string;
  requestHost?: string;
  requestScheme?: string;
  parentRayID?: string;
  cfRay?: string;
  cfConnectingIP?: string;
  cfIpcountry?: string;
  cfTrustedClientCert?: string;
  cfASN?: string;
  cfASO?: string;
  cfBotManagementScore?: number;
  cfBotManagementJScore?: number;
  cfBotManagementEngine?: string;
  cfVerifiedBotCategory?: string;
  cfDLLProtect?: string;
  cfWAFAction?: string;
  firehoseData?: string;
  argoSmartRouting?: boolean;
  argoTieredCaching?: boolean;
  argoAccount?: boolean;
  [key: string]: any;
}

interface LogQuery {
  startTime: number;
  endTime: number;
  filters?: {
    country?: string;
    cacheStatus?: string;
    responseTime?: { min: number; max: number };
    percentile?: 'p75' | 'p95';
    httpStatus?: number;
  };
}

/**
 * 从R2查询日志
 */
// 演示数据生成器（用于测试，当 R2 中没有真实日志时使用）
export function generateDemoLogs(count: number = 1000): CloudflareLog[] {
  const logs: CloudflareLog[] = [];
  const countries = ['US', 'CN', 'GB', 'DE', 'JP', 'IN', 'BR', 'FR', 'CA', 'AU', 'SG', 'KR'];
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
  ];
  const cacheStatuses: Array<'HIT' | 'MISS' | 'EXPIRED' | 'BYPASS'> = ['HIT', 'MISS', 'EXPIRED', 'BYPASS'];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
  const httpStatuses = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 500, 502, 503];
  const contentTypes = ['application/json', 'text/html', 'image/png', 'image/jpeg', 'text/css', 'application/javascript'];

  const now = Date.now();
  const lastHour = now - 3600000;

  for (let i = 0; i < count; i++) {
    const timestamp = lastHour + Math.random() * 3600000;
    const responseTime = Math.floor(Math.random() * 2000) + Math.random() * (Math.random() > 0.8 ? 5000 : 0); // 偶尔有很慢的请求
    
    logs.push({
      timestamp,
      clientCountry: countries[Math.floor(Math.random() * countries.length)],
      clientIP: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      cacheStatus: cacheStatuses[Math.floor(Math.random() * cacheStatuses.length)],
      originResponseTime: Math.floor(Math.random() * 3000),
      edgeResponseTime: responseTime,
      rayID: `ray${Math.random().toString(36).substring(7)}`,
      httpStatus: httpStatuses[Math.floor(Math.random() * httpStatuses.length)],
      httpMethod: httpMethods[Math.floor(Math.random() * httpMethods.length)],
      httpUserAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
      contentType: contentTypes[Math.floor(Math.random() * contentTypes.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      httpHost: 'analytics.example.com',
      httpProtocol: 'HTTP/2',
      tlsVersion: 'TLSv1.3',
      edgeColoCode: 'LAX',
    });
  }

  return logs;
}

export async function queryLogsFromR2(
  bucket: R2Bucket,
  startTime: number,
  endTime: number,
  filters?: LogQuery['filters'],
  limit: number = 10000
): Promise<CloudflareLog[]> {
  const logs: CloudflareLog[] = [];
  const processedPaths = new Set<string>();

  try {
    // 根据时间范围生成日期列表
    const dates = generateDateRange(startTime, endTime);

    for (const date of dates) {
      // 列出该日期下的所有小时日志
      const prefix = `logs/${date}/`;
      const listResult = await bucket.list({ prefix });

      for (const object of listResult.objects) {
        if (processedPaths.has(object.key)) continue;
        processedPaths.add(object.key);

        try {
          const file = await bucket.get(object.key);
          if (!file) continue;

          const content = await file.text();
          const logLines = content.split('\n').filter((line) => line.trim());

          for (const line of logLines) {
            if (logs.length >= limit) break;

            try {
              const log = JSON.parse(line) as CloudflareLog;

              // 应用过滤器
              if (applyFilters(log, filters)) {
                logs.push(log);
              }
            } catch (e) {
              console.warn('Failed to parse log line:', e);
            }
          }

          if (logs.length >= limit) break;
        } catch (error) {
          console.warn(`Failed to process ${object.key}:`, error);
        }
      }

      if (logs.length >= limit) break;
    }

    return logs;
  } catch (error) {
    console.error('Failed to query logs from R2:', error);
    return [];
  }
}

/**
 * 应用过滤器到日志
 */
function applyFilters(log: CloudflareLog, filters?: LogQuery['filters']): boolean {
  if (!filters) return true;

  if (filters.country && log.clientCountry !== filters.country) {
    return false;
  }

  if (filters.cacheStatus && log.cacheStatus !== filters.cacheStatus) {
    return false;
  }

  if (filters.responseTime) {
    const rt = log.originResponseTime || 0;
    if (rt < filters.responseTime.min || rt > filters.responseTime.max) {
      return false;
    }
  }

  if (filters.httpStatus && log.httpStatus !== filters.httpStatus) {
    return false;
  }

  // 百分位数过滤会在调用方处理
  return true;
}

/**
 * 生成日期范围
 */
function generateDateRange(startTime: number, endTime: number): string[] {
  const dates: string[] = [];
  let currentTime = startTime;

  while (currentTime <= endTime) {
    const date = new Date(currentTime);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    if (!dates.includes(dateStr)) {
      dates.push(dateStr);
    }
    currentTime += 24 * 60 * 60 * 1000;
  }

  return dates;
}

/**
 * 处理日志流(用于大量数据处理)
 */
export async function* streamLogsFromR2(
  bucket: R2Bucket,
  startTime: number,
  endTime: number,
  filters?: LogQuery['filters']
): AsyncGenerator<CloudflareLog[]> {
  const dates = generateDateRange(startTime, endTime);
  const batchSize = 1000;
  let batch: CloudflareLog[] = [];

  for (const date of dates) {
    const prefix = `logs/${date}/`;
    const listResult = await bucket.list({ prefix });

    for (const object of listResult.objects) {
      try {
        const file = await bucket.get(object.key);
        if (!file) continue;

        const content = await file.text();
        const logLines = content.split('\n').filter((line) => line.trim());

        for (const line of logLines) {
          try {
            const log = JSON.parse(line) as CloudflareLog;
            if (applyFilters(log, filters)) {
              batch.push(log);
              if (batch.length >= batchSize) {
                yield batch;
                batch = [];
              }
            }
          } catch (e) {
            console.warn('Failed to parse log line:', e);
          }
        }
      } catch (error) {
        console.warn(`Failed to process ${object.key}:`, error);
      }
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}
