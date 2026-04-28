interface AlertRule {
  id: string;
  name: string;
  type: 'percentile' | 'geo' | 'cache';
  condition: {
    metric: string;
    operator: '>' | '<' | '==' | '!=';
    value: number;
  };
  enabled: boolean;
  createdAt: number;
  notifications?: {
    email?: string[];
    slack?: string;
  };
}

export async function alertHandler(req: Request, env: any) {
  const url = new URL(req.url);
  const method = req.method;
  const id = url.pathname.split('/').pop();

  try {
    if (method === 'GET') {
      // 获取所有告警规则
      const rulesJson = await env.CACHE.get('alert:rules');
      const rules: AlertRule[] = rulesJson ? JSON.parse(rulesJson) : getDefaultRules();
      return new Response(JSON.stringify({ success: true, data: rules }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      // 创建新规则
      const body = (await req.json()) as Omit<AlertRule, 'id' | 'createdAt'>;
      const rulesJson = await env.CACHE.get('alert:rules');
      const rules: AlertRule[] = rulesJson ? JSON.parse(rulesJson) : [];

      const newRule: AlertRule = {
        ...body,
        id: `rule_${Date.now()}`,
        createdAt: Date.now(),
      };

      rules.push(newRule);
      await env.CACHE.put('alert:rules', JSON.stringify(rules));

      return new Response(JSON.stringify({ success: true, data: newRule }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      });
    }

    if (method === 'PUT' && id) {
      // 更新规则
      const body = (await req.json()) as Partial<AlertRule>;
      const rulesJson = await env.CACHE.get('alert:rules');
      const rules: AlertRule[] = rulesJson ? JSON.parse(rulesJson) : [];

      const index = rules.findIndex((r) => r.id === id);
      if (index === -1) {
        return new Response(JSON.stringify({ success: false, error: 'Rule not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      rules[index] = { ...rules[index], ...body, id, createdAt: rules[index].createdAt };
      await env.CACHE.put('alert:rules', JSON.stringify(rules));

      return new Response(JSON.stringify({ success: true, data: rules[index] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Alert handler error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function getDefaultRules(): AlertRule[] {
  return [
    {
      id: 'default_p95',
      name: 'P95响应时间告警',
      type: 'percentile',
      condition: {
        metric: 'p95',
        operator: '>',
        value: 1000,
      },
      enabled: true,
      createdAt: Date.now(),
    },
    {
      id: 'default_cachehit',
      name: '缓存命中率低告警',
      type: 'cache',
      condition: {
        metric: 'hitRatio',
        operator: '<',
        value: 0.5,
      },
      enabled: true,
      createdAt: Date.now(),
    },
  ];
}
