import React from 'react';
import { useQuery } from 'react-query';
import { useQueryStore } from '../../store/queryStore';
import MetricsCard from '../MetricsCard';
import ResponsiveChart from '../charts/ResponsiveChart';
import { Loader, TrendingUp, TrendingDown } from 'lucide-react';

export default function ComparisonTab() {
  const { dateRange } = useQueryStore();

  // 获取时序对比数据
  const { data: comparisonData, isLoading } = useQuery(
    ['comparison-metrics', dateRange],
    async () => {
      const response = await fetch(
        `/api/comparison/metrics?startTime=${dateRange.start}&endTime=${dateRange.end}`
      );
      return response.json();
    }
  );

  // 获取时序趋势数据
  const { data: timeSeriesData, isLoading: tsLoading } = useQuery(
    ['comparison-timeseries', dateRange],
    async () => {
      const response = await fetch(
        `/api/comparison/timeseries?startTime=${dateRange.start}&endTime=${dateRange.end}&metric=responseTime`
      );
      return response.json();
    }
  );

  const metrics = comparisonData?.data;
  const isLoadingAny = isLoading || tsLoading;

  return (
    <div className="space-y-6">
      <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-4">
        <p className="text-blue-300">
          📊 展示今天、昨天、周均值和月均值的性能对比
        </p>
      </div>

      {/* 响应时间对比 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">响应时间对比分析</h3>

        {isLoadingAny ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-cf-orange animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 数值对比卡片 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">今天平均</p>
                <p className="text-2xl font-bold text-cf-orange">
                  {metrics?.responseTime?.today?.toFixed(0) || 0}ms
                </p>
                <p className="text-xs text-gray-400 mt-1">平均响应时间</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">昨天平均</p>
                <p className="text-2xl font-bold text-gray-300">
                  {metrics?.responseTime?.yesterday?.toFixed(0) || 0}ms
                </p>
                <p className="text-xs text-gray-400 mt-1">-1天</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">周均值</p>
                <p className="text-2xl font-bold text-gray-300">
                  {metrics?.responseTime?.weekAvg?.toFixed(0) || 0}ms
                </p>
                <p className="text-xs text-gray-400 mt-1">-7天</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">月均值</p>
                <p className="text-2xl font-bold text-gray-300">
                  {metrics?.responseTime?.monthAvg?.toFixed(0) || 0}ms
                </p>
                <p className="text-xs text-gray-400 mt-1">-30天</p>
              </div>
            </div>

            {/* 增长率指标 */}
            <div className="grid grid-cols-3 gap-4">
              <MetricGrowth
                label="环比(今天 vs 昨天)"
                value={metrics?.responseTime?.growth?.dayOnDay || 0}
              />
              <MetricGrowth
                label="周环比"
                value={metrics?.responseTime?.growth?.weekOnWeek || 0}
              />
              <MetricGrowth
                label="月环比"
                value={metrics?.responseTime?.growth?.monthOnMonth || 0}
              />
            </div>

            {/* 时序图表 */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="text-gray-300 font-semibold mb-3">时序趋势</h4>
              <ResponsiveChart
                type="timeseries"
                data={timeSeriesData?.data?.today || []}
                title="响应时间趋势"
              />
            </div>
          </div>
        )}
      </div>

      {/* 缓存命中率对比 */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">缓存命中率对比</h3>

        {isLoadingAny ? (
          <div className="flex justify-center py-8">
            <Loader className="w-6 h-6 text-cf-orange animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">今天命中率</p>
                <p className="text-2xl font-bold text-green-400">
                  {((metrics?.cacheHitRatio?.today || 0) * 100).toFixed(1)}%
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">昨天命中率</p>
                <p className="text-2xl font-bold text-gray-300">
                  {((metrics?.cacheHitRatio?.yesterday || 0) * 100).toFixed(1)}%
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">周均值</p>
                <p className="text-2xl font-bold text-gray-300">
                  {((metrics?.cacheHitRatio?.weekAvg || 0) * 100).toFixed(1)}%
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">月均值</p>
                <p className="text-2xl font-bold text-gray-300">
                  {((metrics?.cacheHitRatio?.monthAvg || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <MetricGrowth
                label="环比(今天 vs 昨天)"
                value={metrics?.cacheHitRatio?.growth?.dayOnDay || 0}
              />
              <MetricGrowth
                label="周环比"
                value={metrics?.cacheHitRatio?.growth?.weekOnWeek || 0}
              />
              <MetricGrowth
                label="月环比"
                value={metrics?.cacheHitRatio?.growth?.monthOnMonth || 0}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricGrowth({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${isPositive ? 'text-red-400' : 'text-green-400'}`} />
        <p className={`text-2xl font-bold ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
          {Math.abs(value).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
