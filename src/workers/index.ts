import { Router } from 'itty-router';
import { logQueryHandler } from './handlers/logQuery';
import { analyticsHandler } from './handlers/analytics';
import { alertHandler } from './handlers/alerts';
import { comparisonHandler } from './handlers/comparison';

interface CloudflareEnv {
  LOGS_BUCKET: R2Bucket;
  CACHE: KVNamespace;
}

const router = Router();

// CORS处理
router.all('*', (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
});

// 日志查询API
router.post('/api/logs/query', logQueryHandler);

// 分析聚合API
router.get('/api/analytics/geo', analyticsHandler);
router.get('/api/analytics/stats', analyticsHandler);
router.get('/api/analytics/percentile', analyticsHandler);

// 告警规则API
router.get('/api/alerts/rules', alertHandler);
router.post('/api/alerts/rules', alertHandler);
router.put('/api/alerts/rules/:id', alertHandler);

// 时间序列对比API
router.get('/api/comparison/timeseries', comparisonHandler);
router.get('/api/comparison/metrics', comparisonHandler);

// 404处理
router.all('*', () => {
  return new Response('Not Found', { status: 404 });
});

export default {
  fetch: (req: Request, env: CloudflareEnv, ctx: ExecutionContext) => {
    return router.handle(req, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;
