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
