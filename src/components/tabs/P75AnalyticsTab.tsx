import React, { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useQueryStore } from '../../store/queryStore';
import { useDataStore } from '../../store/dataStore';
import MetricsCard from '../MetricsCard';
import GeoTable from '../GeoTable';
import LogsTable from '../LogsTable';
import { AlertCircle, Loader } from 'lucide-react';

export default function P75AnalyticsTab() {
  const { dateRange } = useQueryStore();
  const { setStats } = useDataStore();
  const [filteredCountry, setFilteredCountry] = React.useState<string | undefined>();

  // 获取P75分位数统计
  const { data: percentileData, isLoading: percentileLoading } = useQuery(
    ['percentile-p75', dateRange],
    async () => {
      const response = await fetch(
        `/api/analytics/percentile?startTime=${dateRange.start}&endTime=${dateRange.end}`
      );
      return response.json();
    }
  );

  // 获取超过P75的日志
  const { data: logsData, isLoading: logsLoading } = useQuery(
    ['logs-p75', dateRange, filteredCountry],
    async () => {
      const p75Threshold = percentileData?.data?.p75 || 1000;
      const response = await fetch('/api/logs/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: dateRange.start,
          endTime: dateRange.end,
          filters: {
            responseTime: { min: p75Threshold, max: Infinity },
            ...(filteredCountry ? { country: filteredCountry } : {}),
          },
          limit: 5000,
        }),
      });
      return response.json();
    },
    { enabled: !!percentileData }
  );

  // 聚合超过P75的地理数据
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
  const p75Threshold = percentileData?.data?.p75 || 0;
  const exceededCount = logsData?.data?.logs?.length || 0;

  return (
    <div className="space-y-6">
      {/* 告警信息和统计 */}
      <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-yellow-300 font-semibold">P75 响应时间异常</p>
          <p className="text-yellow-200 text-sm">
            有 <strong>{exceededCount}</strong> 个请求超过了P75阈值({p75Threshold.toFixed(0)}ms)
          </p>
        </div>
      </div>

      {/* 顶部指标 */}
      {percentileData?.data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricsCard
            title="P75阈值"
            value={`${p75Threshold.toFixed(0)}ms`}
            compact
          />
          <MetricsCard
            title="超阈值请求"
            value={exceededCount}
            trend={12.5}
            compact
          />
          <MetricsCard
            title="平均超额比例"
            value={`${((logsData?.data?.logs?.reduce((sum: number, log: any) => sum + (log.originResponseTime || 0), 0) / (logsData?.data?.logs?.length || 1) - p75Threshold) / p75Threshold * 100).toFixed(1)}%`}
            compact
          />
          <MetricsCard
            title="最长响应时间"
            value={`${Math.max(...(logsData?.data?.logs?.map((log: any) => log.originResponseTime || 0) || [0])).toFixed(0)}ms`}
            compact
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地理分布 */}
        <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">影响地域</h3>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-cf-orange animate-spin" />
            </div>
          ) : (
            <GeoTable data={geoData} onSelect={setFilteredCountry} />
          )}
        </div>

        {/* 影响分析 */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">性能分析</h3>
          {logsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-cf-orange animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">缓存命中率</p>
                  <p className="text-2xl font-bold text-cf-orange">
                    {((logsData?.data?.logs?.filter((log: any) => log.cacheStatus === 'HIT').length || 0) / (logsData?.data?.logs?.length || 1) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-gray-400 text-sm mb-1">Argo使用率</p>
                  <p className="text-2xl font-bold text-cf-orange">
                    {((logsData?.data?.logs?.filter((log: any) => log.argoSmartRouting).length || 0) / (logsData?.data?.logs?.length || 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <p className="text-gray-400 text-sm mb-2">顶部慢响应</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {logsData?.data?.logs
                    ?.sort((a: any, b: any) => (b.originResponseTime || 0) - (a.originResponseTime || 0))
                    .slice(0, 5)
                    .map((log: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-300">{log.clientCountry}</span>
                        <span className="text-red-400 font-mono">{(log.originResponseTime || 0).toFixed(0)}ms</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 日志详情 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">超阈值请求详情</h3>
        {logsLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-cf-orange animate-spin" />
          </div>
        ) : (
          <LogsTable logs={logsData?.data?.logs || []} highlightP75 />
        )}
      </div>
    </div>
  );
}
