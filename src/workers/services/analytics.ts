/**
 * 数据分析和聚合服务
 */

interface CloudflareLog {
  timestamp: number;
  clientCountry: string;
  clientIP: string;
  cacheStatus: string;
  originResponseTime: number;
  edgeResponseTime: number;
  httpStatus?: number;
  edgeColoName?: string;
  smartRouteColoName?: string;
  argoSmartRouting?: boolean;
  clientDeviceType?: string;
  contentType?: string;
  requestPath?: string;
  [key: string]: any;
}

interface GeoData {
  country: string;
  count: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  cacheHitRatio: number;
  edgeNode: string;
  distance?: number; // 客户端到Cloudflare节点的距离
  distanceToOrigin?: number; // Cloudflare节点到Origin的距离
}

interface AggregateStats {
  totalRequests: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p75ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  cacheHitRatio: number;
  argoSmartRoutingUsage: number;
  avgEdgeResponseTime: number;
  errorRatio: number;
  topCountries: { country: string; count: number }[];
  topEdgeNodes: { node: string; count: number }[];
  topContentTypes: { type: string; count: number }[];
  topStatusCodes: { code: number; count: number }[];
}

/**
 * 聚合地理数据
 */
export function aggregateGeoData(logs: CloudflareLog[]): GeoData[] {
  const geoMap = new Map<string, CloudflareLog[]>();

  // 按国家分组
  logs.forEach((log) => {
    const key = log.clientCountry || 'UNKNOWN';
    if (!geoMap.has(key)) {
      geoMap.set(key, []);
    }
    geoMap.get(key)!.push(log);
  });

  // 聚合每个国家的数据
  const result: GeoData[] = [];

  geoMap.forEach((countryLogs, country) => {
    const responseTimes = countryLogs.map((log) => log.originResponseTime || 0).sort((a, b) => a - b);
    const cacheHits = countryLogs.filter((log) => log.cacheStatus === 'HIT').length;

    // 获取最常用的edge节点
    const nodeMap = new Map<string, number>();
    countryLogs.forEach((log) => {
      const node = log.edgeColoName || 'UNKNOWN';
      nodeMap.set(node, (nodeMap.get(node) || 0) + 1);
    });

    const topNode = Array.from(nodeMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNKNOWN';

    result.push({
      country,
      count: countryLogs.length,
      avgResponseTime: calculateAverage(responseTimes),
      p95ResponseTime: calculatePercentile(responseTimes, 95),
      cacheHitRatio: cacheHits / countryLogs.length,
      edgeNode: topNode,
    });
  });

  return result.sort((a, b) => b.count - a.count);
}

/**
 * 聚合整体统计
 */
export function aggregateStats(logs: CloudflareLog[]): AggregateStats {
  const responseTimes = logs.map((log) => log.originResponseTime || 0).sort((a, b) => a - b);
  const edgeResponseTimes = logs.map((log) => log.edgeResponseTime || 0).sort((a, b) => a - b);

  // 统计各维度数据
  const cacheHits = logs.filter((log) => log.cacheStatus === 'HIT').length;
  const argoUsage = logs.filter((log) => log.argoSmartRouting === true).length;
  const errors = logs.filter((log) => (log.httpStatus || 200) >= 400).length;

  // 聚合顶部数据
  const countryMap = new Map<string, number>();
  const nodeMap = new Map<string, number>();
  const contentTypeMap = new Map<string, number>();
  const statusCodeMap = new Map<number, number>();

  logs.forEach((log) => {
    const country = log.clientCountry || 'UNKNOWN';
    countryMap.set(country, (countryMap.get(country) || 0) + 1);

    const node = log.edgeColoName || 'UNKNOWN';
    nodeMap.set(node, (nodeMap.get(node) || 0) + 1);

    const contentType = log.contentType || 'unknown';
    contentTypeMap.set(contentType, (contentTypeMap.get(contentType) || 0) + 1);

    const statusCode = log.httpStatus || 200;
    statusCodeMap.set(statusCode, (statusCodeMap.get(statusCode) || 0) + 1);
  });

  const topCountries = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topEdgeNodes = Array.from(nodeMap.entries())
    .map(([node, count]) => ({ node, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topContentTypes = Array.from(contentTypeMap.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topStatusCodes = Array.from(statusCodeMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalRequests: logs.length,
    avgResponseTime: calculateAverage(responseTimes),
    p50ResponseTime: calculatePercentile(responseTimes, 50),
    p75ResponseTime: calculatePercentile(responseTimes, 75),
    p95ResponseTime: calculatePercentile(responseTimes, 95),
    p99ResponseTime: calculatePercentile(responseTimes, 99),
    minResponseTime: Math.min(...responseTimes, 0),
    maxResponseTime: Math.max(...responseTimes, 0),
    cacheHitRatio: cacheHits / logs.length,
    argoSmartRoutingUsage: argoUsage / logs.length,
    avgEdgeResponseTime: calculateAverage(edgeResponseTimes),
    errorRatio: errors / logs.length,
    topCountries,
    topEdgeNodes,
    topContentTypes,
    topStatusCodes,
  };
}

/**
 * 计算分位数集合
 */
export function calculatePercentiles(
  sortedArray: number[],
  percentiles: number[] = [50, 75, 95, 99]
): Record<string, number> {
  const result: Record<string, number> = {};

  percentiles.forEach((p) => {
    result[`p${p}`] = calculatePercentile(sortedArray, p);
  });

  return result;
}

/**
 * 计算单个分位数
 */
export function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

/**
 * 计算平均值
 */
export function calculateAverage(array: number[]): number {
  if (array.length === 0) return 0;
  return array.reduce((a, b) => a + b, 0) / array.length;
}

/**
 * 计算中位数
 */
export function calculateMedian(array: number[]): number {
  if (array.length === 0) return 0;
  const sorted = [...array].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 计算标准差
 */
export function calculateStdDev(array: number[]): number {
  if (array.length === 0) return 0;
  const avg = calculateAverage(array);
  const squareDiffs = array.map((value) => Math.pow(value - avg, 2));
  return Math.sqrt(calculateAverage(squareDiffs));
}

/**
 * 识别异常值(使用3-sigma规则)
 */
export function identifyOutliers(array: number[], sigma: number = 3): number[] {
  const avg = calculateAverage(array);
  const stdDev = calculateStdDev(array);
  const lowerBound = avg - sigma * stdDev;
  const upperBound = avg + sigma * stdDev;

  return array.filter((value) => value < lowerBound || value > upperBound);
}
