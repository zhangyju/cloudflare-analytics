import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useQueryStore } from '../../store/queryStore';
import { useDataStore } from '../../store/dataStore';
import MetricsCard from '../MetricsCard';
import GeoTable from '../GeoTable';
import ResponsiveChart from '../charts/ResponsiveChart';
import LogsTable from '../LogsTable';
import { Loader } from 'lucide-react';

export default function GeoAnalyticsTab() {
  const { dateRange, filters } = useQueryStore();
  const { setGeoData, setStats } = useDataStore();
  const [filteredCountry, setFilteredCountry] = useState<string | undefined>();

  // 获取分析数据
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
    ['analytics', dateRange, filters],
    async () => {
      const response = await fetch(
        `/api/analytics/stats?startTime=${dateRange.start}&endTime=${dateRange.end}`
      );
      return response.json();
    },
    { refetchInterval: 60000 } // 每分钟刷新
  );

  // 获取地理数据
  const { data: geoData, isLoading: geoLoading } = useQuery(
    ['geo', dateRange],
    async () => {
      const response = await fetch(
        `/api/analytics/geo?startTime=${dateRange.start}&endTime=${dateRange.end}`
      );
      return response.json();
    }
  );

  // 获取日志数据
  const { data: logsData, isLoading: logsLoading } = useQuery(
    ['logs', dateRange, filteredCountry],
    async () => {
      const response = await fetch('/api/logs/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: dateRange.start,
          endTime: dateRange.end,
          filters: filteredCountry ? { country: filteredCountry } : {},
          limit: 1000,
        }),
      });
      return response.json();
    }
  );

  useEffect(() => {
    if (geoData?.data) {
      setGeoData(geoData.data);
    }
    if (analyticsData?.data) {
      setStats(analyticsData.data);
    }
  }, [geoData, analyticsData]);

  const isLoading = analyticsLoading || geoLoading || logsLoading;

  return (
    <div className="space-y-6">
      {/* 顶部指标卡片 */}
      {analyticsData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            title="平均响应时间"
            value={`${analyticsData.data.avgResponseTime?.toFixed(0) || 0}ms`}
            trend={5.2}
          />
          <MetricsCard
            title="P95响应时间"
            value={`${analyticsData.data.p95ResponseTime?.toFixed(0) || 0}ms`}
            trend={-2.1}
          />
          <MetricsCard
            title="缓存命中率"
            value={`${((analyticsData.data.cacheHitRatio || 0) * 100).toFixed(1)}%`}
            trend={3.4}
          />
          <MetricsCard
            title="Argo使用率"
            value={`${((analyticsData.data.argoSmartRoutingUsage || 0) * 100).toFixed(1)}%`}
            trend={1.2}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 地理分布表格 */}
        <div className="lg:col-span-1 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">国家分布</h3>
          {geoLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-cf-orange animate-spin" />
            </div>
          ) : (
            <GeoTable data={geoData?.data || []} onSelect={setFilteredCountry} />
          )}
        </div>

        {/* 响应时间分布图 */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">响应时间分布</h3>
          {analyticsLoading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 text-cf-orange animate-spin" />
            </div>
          ) : (
            <ResponsiveChart
              type="histogram"
              data={logsData?.data?.logs || []}
              metric="originResponseTime"
            />
          )}
        </div>
      </div>

      {/* 日志表格 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">请求详情</h3>
        {logsLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-cf-orange animate-spin" />
          </div>
        ) : (
          <LogsTable logs={logsData?.data?.logs || []} />
        )}
      </div>
    </div>
  );
}
