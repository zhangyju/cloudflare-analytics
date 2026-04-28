import React from 'react';
import { useQuery } from 'react-query';
import { useQueryStore } from '../../store/queryStore';
import MetricsCard from '../MetricsCard';
import GeoTable from '../GeoTable';
import LogsTable from '../LogsTable';
import { AlertTriangle, Loader } from 'lucide-react';

export default function P95AnalyticsTab() {
  const { dateRange } = useQueryStore();
  const [filteredCountry, setFilteredCountry] = React.useState<string | undefined>();

  // 获取P95分位数统计
  const { data: percentileData, isLoading: percentileLoading } = useQuery(
    ['percentile-p95', dateRange],
    async () => {
      const response = await fetch(
        `/api/analytics/percentile?startTime=${dateRange.start}&endTime=${dateRange.end}`
      );
      return response.json();
    }
  );

  // 获取超过P95的日志
  const { data: logsData, isLoading: logsLoading } = useQuery(
    ['logs-p95', dateRange, filteredCountry],
    async () => {
      const p95Threshold = percentileData?.data?.p95 || 2000;
      const response = await fetch('/api/logs/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: dateRange.start,
          endTime: dateRange.end,
          filters: {
            responseTime: { min: p95Threshold, max: Infinity },
            ...(filteredCountry ? { country: filteredCountry } : {}),
          },
          limit: 5000,
        }),
      });
      return response.json();
    },
    { enabled: !!percentileData }
  );

  // 聚合超过P95的地理数据
  const geoData = React.useMemo(() => {
    if (!logsData?.data?.logs) return [];
    const geoMap = new Map<string, any[]>();

    logsData.data.logs.forEach((log: any) => {
      const country = log.clientCountry || 'UNKNOWN';
      if (!geoMap.has(country)) {
        geoMap.set(country, []);
      }
      geoMap.get(country)!.push(log);
    });

    return Array.from(geoMap.entries()).map(([country, logs]) => ({
      country,
      count: logs.length,
      avgResponseTime: logs.reduce((sum: number, log: any) => sum + (log.originResponseTime || 0), 0) / logs.length,
      p95ResponseTime: logs
        .map((log: any) => log.originResponseTime || 0)
        .sort((a: number, b: number) => a - b)[Math.floor(logs.length * 0.95)],
      cacheHitRatio: logs.filter((log: any) => log.cacheStatus === 'HIT').length / logs.length,
      edgeNode: logs[0]?.edgeColoName || 'UNKNOWN',
    }));
  }, [logsData]);

  const isLoading = percentileLoading || logsLoading;
  const p95Threshold = percentileData?.data?.p95 || 0;
  const exceededCount = logsData?.data?.logs?.length || 0;
  const affectedUsers = exceededCount;

  return (
    <div className="space-y-6">
      {/* 严重告警 */}
      <div className="bg-red-900 border border-red-700 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-300 font-bold text-lg">🚨 严重性能异常</p>
          <p className="text-red-200 text-sm mt-1">
            有 <strong>{affectedUsers}</strong> 个请求超过了P95阈值({p95Threshold.toFixed(0)}ms)，需要立即查证
          </p>
        </div>
      </div>

      {/* 顶部关键指标 */}
      {percentileData?.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard
            title="P95阈值"
            value={`${p95Threshold.toFixed(0)}ms`}
            compact
          />
          <MetricsCard
            title="严重超额"
            value={exceededCount}
            trend={18.3}
            isWarning
            compact
          />
          <MetricsCard
            title="最长延迟"
            value={`${Math.max(...(logsData?.data?.logs?.map((log: any) => log.originResponseTime || 0) || [0])).toFixed(0)}ms`}
            compact
          />
          <MetricsCard
            title="影响面积"
            value={`${new Set(logsData?.data?.logs?.map((log: any) => log.clientCountry)).size} 国家`}
            compact
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地理分布 - 按影响度排序 */}
        <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">严重影响地域</h3>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-cf-orange animate-spin" />
            </div>
          ) : (
            <GeoTable 
              data={geoData.sort((a, b) => b.count - a.count)} 
              onSelect={setFilteredCountry}
              highlightWarning
            />
          )}
        </div>

        {/* RCA 根因分析 */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">根源分析 (RCA)</h3>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-cf-orange animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-900 bg-opacity-30 border border-red-700 rounded p-4">
                <p className="font-semibold text-red-300 mb-2">⚠️ 主要问题指标</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">缓存命中率</p>
                    <p className="text-lg font-bold text-red-400">
                      {((logsData?.data?.logs?.filter((log: any) => log.cacheStatus === 'HIT').length || 0) / (logsData?.data?.logs?.length || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Origin错误率</p>
                    <p className="text-lg font-bold text-red-400">
                      {((logsData?.data?.logs?.filter((log: any) => (log.httpStatus || 200) >= 400).length || 0) / (logsData?.data?.logs?.length || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Argo启用情况</p>
                    <p className="text-lg font-bold text-red-400">
                      {((logsData?.data?.logs?.filter((log: any) => log.argoSmartRouting).length || 0) / (logsData?.data?.logs?.length || 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 rounded p-4">
                <p className="text-gray-300 font-semibold mb-3 text-sm">性能分布</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">超过2000ms的请求</p>
                    <div className="w-full bg-gray-600 rounded h-2">
                      <div
                        className="bg-red-500 h-2 rounded"
                        style={{
                          width: `${Math.min(
                            100,
                            ((logsData?.data?.logs?.filter((log: any) => log.originResponseTime > 2000).length || 0) /
                              (logsData?.data?.logs?.length || 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {(
                        ((logsData?.data?.logs?.filter((log: any) => log.originResponseTime > 2000).length || 0) /
                          (logsData?.data?.logs?.length || 1)) *
                        100
                      ).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded p-4">
                <p className="font-semibold text-blue-300 mb-2">💡 建议</p>
                <ul className="text-xs text-blue-200 space-y-1">
                  <li>✓ 检查 Origin 服务器性能</li>
                  <li>✓ 启用 Argo Smart Routing</li>
                  <li>✓ 增加缓存策略覆盖范围</li>
                  <li>✓ 分析网络延迟根源</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 详细日志 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          严重异常请求 ({exceededCount})
        </h3>
        {logsLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-cf-orange animate-spin" />
          </div>
        ) : (
          <LogsTable 
            logs={logsData?.data?.logs?.sort((a: any, b: any) => (b.originResponseTime || 0) - (a.originResponseTime || 0)) || []}
            highlightP95
          />
        )}
      </div>
    </div>
  );
}
