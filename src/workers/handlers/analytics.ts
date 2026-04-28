import { queryLogsFromR2 } from '../services/logService';
import { aggregateGeoData, aggregateStats } from '../services/analytics';

export async function analyticsHandler(req: Request, env: any) {
  const url = new URL(req.url);
  const type = url.pathname.split('/').pop();
  const startTime = parseInt(url.searchParams.get('startTime') || '0');
  const endTime = parseInt(url.searchParams.get('endTime') || String(Date.now()));
  const percentile = url.searchParams.get('percentile') as 'p75' | 'p95' | undefined;

  try {
    // 检查缓存
    const cacheKey = `analytics:${type}:${startTime}:${endTime}:${percentile || 'all'}`;
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 查询日志
    const filters = percentile ? { percentile } : undefined;
    const logs = await queryLogsFromR2(env.LOGS_BUCKET, startTime, endTime, filters);

    let result: any;

    if (type === 'geo') {
      result = aggregateGeoData(logs);
    } else if (type === 'stats') {
      result = aggregateStats(logs);
    } else if (type === 'percentile') {
      const responseTimes = logs.map((log) => log.originResponseTime || 0).sort((a, b) => a - b);
      result = {
        p50: calculatePercentile(responseTimes, 50),
        p75: calculatePercentile(responseTimes, 75),
        p95: calculatePercentile(responseTimes, 95),
        p99: calculatePercentile(responseTimes, 99),
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        mean: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      };
    }

    const response = JSON.stringify({
      success: true,
      type,
      data: result,
      timestamp: Date.now(),
    });

    // 缓存结果(5分钟TTL)
    env.CACHE.put(cacheKey, response, { expirationTtl: 300 });

    return new Response(response, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}
