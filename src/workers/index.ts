import { alertHandler } from './handlers/alerts';
import { aggregateGeoData, aggregateStats } from './services/analytics';
import { normalizePascalLog } from './services/logService';

interface CloudflareEnv {
  LOGS_BUCKET: R2Bucket;
  CACHE: KVNamespace;
}

// -----------------------------------------------------------------------
// 工具函数
// -----------------------------------------------------------------------
function cors(response: Response): Response {
  const h = new Headers(response.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// -----------------------------------------------------------------------
// 聚合 API：从 KV 读预聚合缓存
// -----------------------------------------------------------------------
async function handleAnalytics(path: string, env: CloudflareEnv): Promise<Response> {
  const type = path.split('/').pop(); // stats | geo | percentile
  const key = `agg:${type}:today`;
  const cached = await env.CACHE.get(key);
  if (cached) {
    return json({ success: true, type, data: JSON.parse(cached), cached: true });
  }
  return json({ success: false, error: 'No aggregated data yet. Cron runs every 15 min, or call /api/admin/aggregate.' }, 503);
}

async function handleLogsQuery(env: CloudflareEnv): Promise<Response> {
  const cached = await env.CACHE.get('agg:logs:recent');
  if (cached) {
    return json({ success: true, logs: JSON.parse(cached), cached: true });
  }
  return json({ success: false, error: 'No data yet.', logs: [] }, 503);
}

async function handleComparison(path: string, env: CloudflareEnv): Promise<Response> {
  const type = path.includes('timeseries') ? 'timeseries' : 'metrics';
  const cached = await env.CACHE.get(`agg:comparison:${type}`);
  if (cached) return json({ success: true, data: JSON.parse(cached), cached: true });
  return json({ success: false, error: 'No data yet.' }, 503);
}

// -----------------------------------------------------------------------
// Cron 聚合：从 R2 读最新文件，聚合后写 KV
// -----------------------------------------------------------------------
async function runAggregation(env: CloudflareEnv): Promise<void> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0].replace(/-/g, ''); // 20260715
  const prefix = `zone-logs/${todayStr}/`;

  const MAX_FILES = 15;
  const BATCH = 5;

  const listResult = await env.LOGS_BUCKET.list({ prefix, limit: MAX_FILES });
  const objects = listResult.objects;

  console.log(`Found ${objects.length} files under ${prefix}`);
  if (objects.length === 0) return;



  const allLogs: ReturnType<typeof normalizePascalLog>[] = [];

  for (let i = 0; i < objects.length; i += BATCH) {
    const batch = objects.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async (obj) => {
        const file = await env.LOGS_BUCKET.get(obj.key);
        if (!file) { console.log('file not found:', obj.key); return [] as ReturnType<typeof normalizePascalLog>[]; }

        // Logpush 文件是真实的 gzip 压缩，需要解压
        let text: string;
        const arrayBuffer = await file.arrayBuffer();
        const isGzip = obj.key.endsWith('.gz') || (arrayBuffer.byteLength > 2 && new Uint8Array(arrayBuffer)[0] === 0x1f && new Uint8Array(arrayBuffer)[1] === 0x8b);
        if (isGzip) {
          const ds = new DecompressionStream('gzip');
          const writer = ds.writable.getWriter();
          writer.write(arrayBuffer);
          writer.close();
          const decompressed = await new Response(ds.readable).arrayBuffer();
          text = new TextDecoder().decode(decompressed);
        } else {
          text = new TextDecoder().decode(arrayBuffer);
        }

        const lines = text.split('\n').filter((l) => l.trim());
        return lines.flatMap((l) => {
          try { return [normalizePascalLog(JSON.parse(l))]; }
          catch (e) { console.warn('parse error:', String(e).substring(0, 100)); return []; }
        });
      })
    );
    for (const r of results) {
      if (r.status === 'fulfilled') allLogs.push(...r.value);
      else console.warn('batch error:', r.reason);
    }
  }

  console.log(`Aggregating ${allLogs.length} logs`);
  const TTL = 60 * 30; // 30 分钟

  const stats = aggregateStats(allLogs);
  await env.CACHE.put('agg:stats:today', JSON.stringify(stats), { expirationTtl: TTL });

  const geo = aggregateGeoData(allLogs);
  await env.CACHE.put('agg:geo:today', JSON.stringify(geo), { expirationTtl: TTL });

  const times = allLogs.map((l) => l.originResponseTime || 0).sort((a, b) => a - b);
  const pct = (p: number) => times.length ? times[Math.max(0, Math.ceil((p / 100) * times.length) - 1)] : 0;
  await env.CACHE.put('agg:percentile:today', JSON.stringify({
    p50: pct(50), p75: pct(75), p95: pct(95), p99: pct(99),
    min: times[0] ?? 0, max: times[times.length - 1] ?? 0,
    mean: times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0,
  }), { expirationTtl: TTL });

  await env.CACHE.put('agg:logs:recent', JSON.stringify(allLogs.slice(0, 200)), { expirationTtl: TTL });

  const comparison = { today: stats, generatedAt: now.toISOString(), fileCount: objects.length, logCount: allLogs.length };
  await env.CACHE.put('agg:comparison:metrics', JSON.stringify(comparison), { expirationTtl: TTL });
  await env.CACHE.put('agg:comparison:timeseries', JSON.stringify({ data: allLogs.slice(0, 500).map(l => ({ ts: l.timestamp, rt: l.originResponseTime, country: l.clientCountry })), generatedAt: now.toISOString() }), { expirationTtl: TTL });

  console.log('Aggregation complete');
}

// -----------------------------------------------------------------------
// 简单路由（不依赖第三方 router）
// -----------------------------------------------------------------------
async function route(req: Request, env: CloudflareEnv): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // 分析聚合
  if (method === 'GET' && (path === '/api/analytics/stats' || path === '/api/analytics/geo' || path === '/api/analytics/percentile')) {
    return handleAnalytics(path, env);
  }
  // 日志查询
  if (method === 'POST' && path === '/api/logs/query') {
    return handleLogsQuery(env);
  }
  // 对比
  if (method === 'GET' && (path === '/api/comparison/metrics' || path === '/api/comparison/timeseries')) {
    return handleComparison(path, env);
  }
  // 告警
  if (path.startsWith('/api/alerts')) {
    return alertHandler(req, env);
  }
  // 手动聚合（调试）- 返回后台执行，不阻塞请求
  if (method === 'GET' && path === '/api/admin/aggregate') {
    return json({ success: true, message: 'Aggregation started in background. Check /api/analytics/stats in ~30s.' });
  }

  return json({ error: 'Not Found' }, 404);
}

// -----------------------------------------------------------------------
// Worker export
// -----------------------------------------------------------------------
export default {
  fetch: async (req: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    // 手动触发聚合（后台执行，不阻塞响应）
    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/api/admin/aggregate') {
      ctx.waitUntil(runAggregation(env));
      return cors(json({ success: true, message: 'Aggregation started in background. Check /api/analytics/stats in ~30s.' }));
    }
    const response = await route(req, env);
    return cors(response);
  },

  scheduled: async (_event: ScheduledEvent, env: CloudflareEnv, _ctx: ExecutionContext): Promise<void> => {
    await runAggregation(env);
  },
} satisfies ExportedHandler<CloudflareEnv>;
