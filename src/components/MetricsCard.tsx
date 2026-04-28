import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  trend?: number;
  isWarning?: boolean;
  compact?: boolean;
}

export default function MetricsCard({
  title,
  value,
  trend,
  isWarning = false,
  compact = false,
}: MetricsCardProps) {
  const isTrendPositive = (trend || 0) > 0;
  const trendIcon = isTrendPositive ? TrendingUp : TrendingDown;
  const trendColor = isWarning ? 'text-red-400' : isTrendPositive ? 'text-green-400' : 'text-blue-400';

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 p-4 ${compact ? 'p-3' : 'p-6'}`}>
      <p className={`text-gray-400 font-medium ${compact ? 'text-xs' : 'text-sm'} mb-2`}>{title}</p>
      <div className="flex items-end justify-between">
        <p className={`${compact ? 'text-xl' : 'text-2xl'} font-bold text-white`}>{value}</p>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 ${trendColor} text-xs font-semibold`}>
            {React.createElement(trendIcon, { className: 'w-3 h-3' })}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
}
