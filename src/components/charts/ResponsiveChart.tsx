import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface Log {
  timestamp: number;
  originResponseTime?: number;
  edgeResponseTime?: number;
  [key: string]: any;
}

interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  count: number;
}

interface ResponsiveChartProps {
  type: 'histogram' | 'timeseries' | 'distribution';
  data: Log[] | TimeSeriesPoint[];
  metric?: string;
  title?: string;
}

export default function ResponsiveChart({
  type,
  data,
  metric = 'originResponseTime',
  title,
}: ResponsiveChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // 初始化或获取现有图表实例
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, 'dark', { useDirtyRect: true });
    }

    const chart = chartInstanceRef.current;
    let option: echarts.EChartsOption = {};

    if (type === 'histogram') {
      // 响应时间分布直方图
      const values = (data as Log[])
        .map((log) => log[metric] || 0)
        .filter((v) => v > 0);

      if (values.length === 0) {
        option = {
          title: { text: '暂无数据', left: 'center' },
        };
      } else {
        const max = Math.max(...values);
        const bins = 20;
        const binSize = Math.ceil(max / bins);
        const histogram = new Array(bins).fill(0);

        values.forEach((v) => {
          const binIndex = Math.min(Math.floor(v / binSize), bins - 1);
          histogram[binIndex]++;
        });

        const xAxisData = histogram.map((_, i) => `${(i * binSize).toFixed(0)}-${((i + 1) * binSize).toFixed(0)}ms`);

        option = {
          title: { text: '响应时间分布', left: 'center' },
          tooltip: { trigger: 'axis' },
          grid: { left: '60px', right: '20px', bottom: '60px', containLabel: true },
          xAxis: { type: 'category', data: xAxisData, axisLabel: { rotate: 45 } },
          yAxis: { type: 'value' },
          series: [
            {
              data: histogram,
              type: 'bar',
              itemStyle: { color: '#F37220' },
            },
          ],
        };
      }
    } else if (type === 'timeseries') {
      // 时序曲线图
      const timeSeriesData = data as TimeSeriesPoint[];

      if (timeSeriesData.length === 0) {
        option = {
          title: { text: '暂无数据', left: 'center' },
        };
      } else {
        const timestamps = timeSeriesData.map((d) => new Date(d.timestamp).toLocaleTimeString());
        const values = timeSeriesData.map((d) => d.value.toFixed(0));

        option = {
          title: { text: title || '时序趋势', left: 'center' },
          tooltip: { trigger: 'axis' },
          grid: { left: '60px', right: '20px', bottom: '60px', containLabel: true },
          xAxis: { type: 'category', data: timestamps },
          yAxis: { type: 'value', name: '响应时间(ms)' },
          series: [
            {
              data: values,
              type: 'line',
              smooth: true,
              itemStyle: { color: '#F37220' },
              areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(243, 114, 32, 0.5)' },
                { offset: 1, color: 'rgba(243, 114, 32, 0)' },
              ]) },
            },
          ],
        };
      }
    } else if (type === 'distribution') {
      // 分布图(备用)
      const values = (data as Log[])
        .map((log) => log[metric] || 0)
        .sort((a, b) => a - b);

      if (values.length === 0) {
        option = {
          title: { text: '暂无数据', left: 'center' },
        };
      } else {
        option = {
          title: { text: '响应时间分布', left: 'center' },
          tooltip: { trigger: 'item' },
          series: [
            {
              type: 'scatter',
              data: values.map((v, i) => [i, v]),
              itemStyle: { color: '#F37220' },
            },
          ],
        };
      }
    }

    chart.setOption(option);

    // 处理窗口大小改变
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [type, data, metric, title]);

  return (
    <div ref={chartRef} className="w-full h-80" />
  );
}
