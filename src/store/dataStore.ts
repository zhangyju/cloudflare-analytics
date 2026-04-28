import { create } from 'zustand';

interface GeoData {
  country: string;
  count: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  cacheHitRatio: number;
  edgeNode: string;
}

interface AggregateStats {
  totalRequests: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p75ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRatio: number;
  argoSmartRoutingUsage: number;
  errorRatio: number;
  topCountries: { country: string; count: number }[];
  topEdgeNodes: { node: string; count: number }[];
}

interface DataStore {
  geoData: GeoData[];
  setGeoData: (data: GeoData[]) => void;
  stats: AggregateStats | null;
  setStats: (stats: AggregateStats) => void;
  lastUpdated: number;
  setLastUpdated: (time: number) => void;
}

export const useDataStore = create<DataStore>((set) => ({
  geoData: [],
  setGeoData: (data) => set({ geoData: data, lastUpdated: Date.now() }),
  stats: null,
  setStats: (stats) => set({ stats }),
  lastUpdated: 0,
  setLastUpdated: (time) => set({ lastUpdated: time }),
}));
