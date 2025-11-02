/**
 * Hook for Performance Monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPerformanceSummary,
  getSlowQueries,
  getSlowPageLoads,
  getMemoryMetrics,
  clearPerformanceData,
} from '@/lib/monitoring/performance.service';
import type { PerformanceSummary, QueryPerformance, PagePerformance, MemoryMetrics } from '@/lib/monitoring/performance.types';

export interface UsePerformanceOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const { autoRefresh = false, refreshInterval = 5000 } = options;

  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [slowQueries, setSlowQueries] = useState<QueryPerformance[]>([]);
  const [slowPages, setSlowPages] = useState<PagePerformance[]>([]);
  const [memory, setMemory] = useState<MemoryMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    try {
      setLoading(true);
      setSummary(getPerformanceSummary());
      setSlowQueries(getSlowQueries());
      setSlowPages(getSlowPageLoads());
      setMemory(getMemoryMetrics());
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    clearPerformanceData();
    refresh();
  }, [refresh]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    summary,
    slowQueries,
    slowPages,
    memory,
    loading,
    refresh,
    clear,
  };
}
