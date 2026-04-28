import React from 'react';
import { Globe } from 'lucide-react';

interface GeoData {
  country: string;
  count: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  cacheHitRatio: number;
  edgeNode: string;
}

interface GeoTableProps {
  data: GeoData[];
  onSelect?: (country: string) => void;
  highlightWarning?: boolean;
}

const countryEmojis: Record<string, string> = {
  CN: '🇨🇳',
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  FR: '🇫🇷',
  JP: '🇯🇵',
  SG: '🇸🇬',
  AU: '🇦🇺',
  CA: '🇨🇦',
  IN: '🇮🇳',
};

export default function GeoTable({ data, onSelect, highlightWarning }: GeoTableProps) {
  return (
    <div className="space-y-2">
      {data.length === 0 ? (
        <p className="text-center text-gray-400 py-4">暂无数据</p>
      ) : (
        data.slice(0, 10).map((geo, idx) => {
          const emoji = countryEmojis[geo.country] || '🌐';
          const isWarning = highlightWarning && idx < 3;

          return (
            <button
              key={geo.country}
              onClick={() => onSelect?.(geo.country)}
              className={`w-full text-left p-3 rounded transition-colors ${
                isWarning
                  ? 'bg-red-900 bg-opacity-30 border border-red-700 hover:bg-red-900 hover:bg-opacity-50'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    {geo.country}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {geo.count} 请求 | {geo.edgeNode}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-cf-orange">{geo.avgResponseTime.toFixed(0)}ms</p>
                  <p className="text-xs text-gray-400">
                    缓存 {(geo.cacheHitRatio * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
