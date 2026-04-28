import { create } from 'zustand';

export interface DateRange {
  start: number;
  end: number;
}

interface QueryStore {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  filters: {
    country?: string;
    cacheStatus?: string;
    responseTimeRange?: { min: number; max: number };
  };
  setFilters: (filters: QueryStore['filters']) => void;
  clearFilters: () => void;
}

const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;

export const useQueryStore = create<QueryStore>((set) => ({
  dateRange: {
    start: now - 7 * oneDayMs, // 默认过去7天
    end: now,
  },
  setDateRange: (range) => set({ dateRange: range }),
  filters: {},
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}));
