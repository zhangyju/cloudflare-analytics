import React, { useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Log {
  timestamp: number;
  clientCountry: string;
  originResponseTime: number;
  edgeResponseTime: number;
  cacheStatus: string;
  httpStatus: number;
  edgeColoName: string;
  argoSmartRouting: boolean;
  contentType?: string;
  requestPath?: string;
  rayID?: string;
}

interface LogsTableProps {
  logs: Log[];
  highlightP75?: boolean;
  highlightP95?: boolean;
}

export default function LogsTable({ logs, highlightP75, highlightP95 }: LogsTableProps) {
  const [sortConfig, setSortConfig] = React.useState<{
    key: keyof Log;
    direction: 'asc' | 'desc';
  }>({
    key: 'timestamp',
    direction: 'desc',
  });

  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const sorted = useMemo(() => {
    const copy = [...logs];
    copy.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      return 0;
    });

    return copy;
  }, [logs, sortConfig]);

  const p95 = useMemo(() => {
    if (logs.length === 0) return 0;
    const sorted = [...logs].sort((a, b) => (a.originResponseTime || 0) - (b.originResponseTime || 0));
    return sorted[Math.floor(sorted.length * 0.95)]?.originResponseTime || 0;
  }, [logs]);

  const p75 = useMemo(() => {
    if (logs.length === 0) return 0;
    const sorted = [...logs].sort((a, b) => (a.originResponseTime || 0) - (b.originResponseTime || 0));
    return sorted[Math.floor(sorted.length * 0.75)]?.originResponseTime || 0;
  }, [logs]);

  const handleSort = (key: keyof Log) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const SortIcon = ({ k }: { k: keyof Log }) => {
    if (sortConfig.key !== k) return null;
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline" />
    ) : (
      <ChevronDown className="w-3 h-3 inline" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-700 bg-opacity-50">
            <th className="text-left px-4 py-3 font-semibold text-gray-300">
              <button
                onClick={() => handleSort('timestamp')}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                时间
                <SortIcon k="timestamp" />
              </button>
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-300">
              <button
                onClick={() => handleSort('clientCountry')}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                国家
                <SortIcon k="clientCountry" />
              </button>
            </th>
            <th className="text-right px-4 py-3 font-semibold text-gray-300">
              <button
                onClick={() => handleSort('originResponseTime')}
                className="hover:text-white transition-colors flex items-center gap-1 ml-auto"
              >
                响应时间
                <SortIcon k="originResponseTime" />
              </button>
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-300">
              <button
                onClick={() => handleSort('cacheStatus')}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                缓存
                <SortIcon k="cacheStatus" />
              </button>
            </th>
            <th className="text-center px-4 py-3 font-semibold text-gray-300">
              <button
                onClick={() => handleSort('httpStatus')}
                className="hover:text-white transition-colors flex items-center gap-1 ml-auto"
              >
                状态
                <SortIcon k="httpStatus" />
              </button>
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-300">节点</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {sorted.map((log, idx) => {
            const isP95 = highlightP95 && log.originResponseTime > p95;
            const isP75 = highlightP75 && log.originResponseTime > p75 && !isP95;
            const rowId = `${log.timestamp}-${idx}`;

            return (
              <React.Fragment key={rowId}>
                <tr
                  className={`transition-colors hover:bg-gray-700 cursor-pointer ${
                    isP95 ? 'bg-red-900 bg-opacity-30' : isP75 ? 'bg-yellow-900 bg-opacity-20' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setExpandedId(expandedId === rowId ? null : rowId)}
                >
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{log.clientCountry}</td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${
                    isP95 ? 'text-red-400' : isP75 ? 'text-yellow-400' : 'text-cf-orange'
                  }`}>
                    {(log.originResponseTime || 0).toFixed(0)}ms
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      log.cacheStatus === 'HIT' ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {log.cacheStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">
                    <span className={
                      log.httpStatus >= 400 ? 'text-red-400 font-bold' : 'text-green-400'
                    }>
                      {log.httpStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.edgeColoName}</td>
                </tr>

                {expandedId === rowId && (
                  <tr className="bg-gray-700 bg-opacity-50">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs font-semibold">Ray ID</p>
                          <p className="text-gray-300 font-mono">{log.rayID}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs font-semibold">Edge响应时间</p>
                          <p className="text-gray-300">{(log.edgeResponseTime || 0).toFixed(0)}ms</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs font-semibold">Argo Smart Routing</p>
                          <p className={`${log.argoSmartRouting ? 'text-green-400' : 'text-gray-400'}`}>
                            {log.argoSmartRouting ? '✓ 已启用' : '✗ 未启用'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs font-semibold">内容类型</p>
                          <p className="text-gray-300 text-xs">{log.contentType || 'N/A'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-gray-400 text-xs font-semibold">请求路径</p>
                          <p className="text-gray-300 text-xs break-all">{log.requestPath || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          暂无日志数据
        </div>
      )}
    </div>
  );
}
