import { queryLogsFromR2 } from '../services/logService';
import { aggregateStats } from '../services/analytics';

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  count: number;
}

interface ComparisonMetrics {
  metric: string;
  today: TimeSeriesPoint[];
  yesterday: TimeSeriesPoint[];
  weekAvg: TimeSeriesPoint[];
  monthAvg: TimeSeriesPoint[];
  growth: {
    dayOnDay: number;
    weekOnWeek: number;
    monthOnMonth: number;
  };
}

export async function comparisonHandler(req: Request, env: any) {
  const url = new URL(req.url);
  const type = url.pathname.split('/').pop();
  const metric = url.searchParams.get('metric') || 'responseTime';
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  try {
    // 查询多个时间段的数据
    const today = await queryLogsFromR2(env.LOGS_BUCKET, now - oneDayMs, now);
    const yesterday = await queryLogsFromR2(env.LOGS_BUCKET, now - 2 * oneDayMs, now - oneDayMs);
    const weekAvg = await queryLogsFromR2(env.LOGS_BUCKET, now - 7 * oneDayMs, now);
    const monthAvg = await queryLogsFromR2(env.LOGS_BUCKET, now - 30 * oneDayMs, now);

    let result: any;

    if (type === 'timeseries') {
      result = {
        today: buildTimeSeries(today, metric),
        yesterday: buildTimeSeries(yesterday, metric),
        weekAvg: buildTimeSeries(weekAvg, metric, 7),
        monthAvg: buildTimeSeries(monthAvg, metric, 30),
      };
    } else if (type === 'metrics') {
      const todayStats = aggregateStats(today);
      const yesterdayStats = aggregateStats(yesterday);
      const weekStats = aggregateStats(weekAvg);
      const monthStats = aggregateStats(monthAvg);

      result = {
        responseTime: {
          today: todayStats.avgResponseTime,
          yesterday: yesterdayStats.avgResponseTime,
          weekAvg: weekStats.avgResponseTime,
          monthAvg: monthStats.avgResponseTime,
          growth: {
            dayOnDay: ((todayStats.avgResponseTime - yesterdayStats.avgResponseTime) / yesterdayStats.avgResponseTime) * 100,
            weekOnWeek:
              ((todayStats.avgResponseTime - weekStats.avgResponseTime) / weekStats.avgResponseTime) * 100,
            monthOnMonth:
              ((todayStats.avgResponseTime - monthStats.avgResponseTime) / monthStats.avgResponseTime) * 100,
          },
        },
        cacheHitRatio: {
          today: todayStats.cacheHitRatio,
          yesterday: yesterdayStats.cacheHitRatio,
          weekAvg: weekStats.cacheHitRatio,
          monthAvg: monthStats.cacheHitRatio,
          growth: {
            dayOnDay: ((todayStats.cacheHitRatio - yesterdayStats.cacheHitRatio) / yesterdayStats.cacheHitRatio) * 100,
            weekOnWeek: ((todayStats.cacheHitRatio - weekStats.cacheHitRatio) / weekStats.cacheHitRatio) * 100,
            monthOnMonth:
              ((todayStats.cacheHitRatio - monthStats.cacheHitRatio) / monthStats.cacheHitRatio) * 100,
          },
        },
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        type,
        data: result,
        timestamp: Date.now(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Comparison error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function buildTimeSeries(logs: any[], metric: string, windowDays: number = 1): TimeSeriesPoint[] {
  const bucketSize = windowDays > 1 ? 60 * 60 * 1000 : 5 * 60 * 1000; // 1小时或5分钟
  const buckets = new Map<number, { sum: number; count: number }>();

  logs.forEach((log) => {
    const timestamp = Math.floor(log.timestamp / bucketSize) * bucketSize;
    let value = 0;

    if (metric === 'responseTime') {
      value = log.originResponseTime || 0;
    } else if (metric === 'cacheHitRatio') {
      value = log.cacheStatus === 'HIT' ? 1 : 0;
    }

    if (!buckets.has(timestamp)) {
      buckets.set(timestamp, { sum: 0, count: 0 });
    }
    const bucket = buckets.get(timestamp)!;
    bucket.sum += value;
    bucket.count += 1;
  });

  return Array.from(buckets.entries())
    .map(([timestamp, bucket]) => ({
      timestamp,
      value: bucket.sum / bucket.count,
      count: bucket.count,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}
