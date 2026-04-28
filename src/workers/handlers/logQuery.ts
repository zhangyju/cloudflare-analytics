import { queryLogsFromR2 } from '../services/logService';
import { calculatePercentiles, aggregateGeoData } from '../services/analytics';

interface QueryRequest {
  startTime: number;
  endTime: number;
  filters?: {
    country?: string;
    cacheStatus?: string;
    responseTime?: { min: number; max: number };
    percentile?: 'p75' | 'p95';
  };
  limit?: number;
}

export async function logQueryHandler(req: Request, env: any) {
  try {
    const body = (await req.json()) as QueryRequest;
    const { startTime, endTime, filters, limit = 10000 } = body;

    // 1. 从R2查询日志
    const logs = await queryLogsFromR2(env.LOGS_BUCKET, startTime, endTime, filters, limit);

    // 2. 计算分位数
    const responseTimes = logs.map((log) => log.originResponseTime || 0).sort((a, b) => a - b);
    const percentiles = calculatePercentiles(responseTimes, [50, 75, 95, 99]);

    // 3. 聚合地理数据
    const geoData = aggregateGeoData(logs);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          logs: logs.slice(0, limit),
          totalCount: logs.length,
          percentiles,
          geoData,
          timestamp: Date.now(),
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Log query error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
