import { queryLogsFromR2, generateDemoLogs } from '../services/logService';
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
  useDemo?: boolean;
}

export async function logQueryHandler(req: Request, env: any) {
  try {
    const body = (await req.json()) as QueryRequest;
    const { startTime, endTime, filters, limit = 10000, useDemo = false } = body;

    // 1. 从R2查询日志，如果没有数据或启用演示模式则使用演示数据
    let logs;
    if (useDemo) {
      console.log('Using demo logs for testing');
      logs = generateDemoLogs(1000);
    } else {
      logs = await queryLogsFromR2(env.LOGS_BUCKET, startTime, endTime, filters, limit);
      
      // 如果 R2 中没有日志，使用演示数据
      if (logs.length === 0) {
        console.log('No logs found in R2, using demo logs');
        logs = generateDemoLogs(1000);
      }
    }

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
