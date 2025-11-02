/**
 * Performance Monitoring Service
 *
 * Tracks and analyzes application performance metrics
 */

import type {
  PerformanceMetric,
  QueryPerformance,
  PagePerformance,
  MemoryMetrics,
  PerformanceSummary,
  PerformanceThresholds,
} from './performance.types';

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  slowQueryMs: 100,
  slowPageLoadMs: 1000,
  highMemoryPercentage: 80,
};

const STORAGE_KEYS = {
  queries: 'perf-queries',
  pages: 'perf-pages',
  metrics: 'perf-metrics',
} as const;

const MAX_STORED_ENTRIES = 200;

/**
 * Get performance thresholds
 */
export function getThresholds(): PerformanceThresholds {
  try {
    const stored = localStorage.getItem('perf-thresholds');
    if (stored) {
      return { ...DEFAULT_THRESHOLDS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load thresholds:', error);
  }
  return DEFAULT_THRESHOLDS;
}

/**
 * Update performance thresholds
 */
export function updateThresholds(thresholds: Partial<PerformanceThresholds>): void {
  try {
    const current = getThresholds();
    const updated = { ...current, ...thresholds };
    localStorage.setItem('perf-thresholds', JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update thresholds:', error);
  }
}

/**
 * Track query performance
 */
export function trackQuery(
  table: string,
  operation: QueryPerformance['operation'],
  duration: number,
  recordCount?: number
): QueryPerformance {
  const thresholds = getThresholds();

  const query: QueryPerformance = {
    id: crypto.randomUUID(),
    table,
    operation,
    duration,
    recordCount,
    timestamp: new Date(),
    slow: duration > thresholds.slowQueryMs,
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.queries);
    const queries: QueryPerformance[] = stored ? JSON.parse(stored) : [];

    queries.push(query);

    // Keep only last N entries
    if (queries.length > MAX_STORED_ENTRIES) {
      queries.shift();
    }

    localStorage.setItem(STORAGE_KEYS.queries, JSON.stringify(queries));
  } catch (error) {
    console.error('Failed to track query:', error);
  }

  return query;
}

/**
 * Track page load performance
 */
export function trackPageLoad(
  path: string,
  loadTime: number,
  renderTime: number
): PagePerformance {
  const page: PagePerformance = {
    id: crypto.randomUUID(),
    path,
    loadTime,
    renderTime,
    timestamp: new Date(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.pages);
    const pages: PagePerformance[] = stored ? JSON.parse(stored) : [];

    pages.push(page);

    // Keep only last N entries
    if (pages.length > MAX_STORED_ENTRIES) {
      pages.shift();
    }

    localStorage.setItem(STORAGE_KEYS.pages, JSON.stringify(pages));
  } catch (error) {
    console.error('Failed to track page load:', error);
  }

  return page;
}

/**
 * Track custom performance metric
 */
export function trackMetric(
  name: string,
  value: number,
  unit: PerformanceMetric['unit'],
  metadata?: Record<string, any>
): PerformanceMetric {
  const metric: PerformanceMetric = {
    id: crypto.randomUUID(),
    name,
    value,
    unit,
    timestamp: new Date(),
    metadata,
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.metrics);
    const metrics: PerformanceMetric[] = stored ? JSON.parse(stored) : [];

    metrics.push(metric);

    // Keep only last N entries
    if (metrics.length > MAX_STORED_ENTRIES) {
      metrics.shift();
    }

    localStorage.setItem(STORAGE_KEYS.metrics, JSON.stringify(metrics));
  } catch (error) {
    console.error('Failed to track metric:', error);
  }

  return metric;
}

/**
 * Get current memory metrics (browser only)
 */
export function getMemoryMetrics(): MemoryMetrics | null {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null;
  }

  const perf = window.performance as any;

  if (!perf.memory) {
    return null;
  }

  const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = perf.memory;

  return {
    usedJSHeapSize,
    totalJSHeapSize,
    jsHeapSizeLimit,
    percentage: (usedJSHeapSize / jsHeapSizeLimit) * 100,
    timestamp: new Date(),
  };
}

/**
 * Get all queries within time range
 */
export function getQueries(startDate?: Date, endDate?: Date): QueryPerformance[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.queries);
    if (!stored) return [];

    let queries: QueryPerformance[] = JSON.parse(stored);

    // Convert string dates back to Date objects
    queries = queries.map(q => ({
      ...q,
      timestamp: new Date(q.timestamp),
    }));

    if (startDate || endDate) {
      queries = queries.filter(q => {
        if (startDate && q.timestamp < startDate) return false;
        if (endDate && q.timestamp > endDate) return false;
        return true;
      });
    }

    return queries;
  } catch (error) {
    console.error('Failed to get queries:', error);
    return [];
  }
}

/**
 * Get all page loads within time range
 */
export function getPageLoads(startDate?: Date, endDate?: Date): PagePerformance[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.pages);
    if (!stored) return [];

    let pages: PagePerformance[] = JSON.parse(stored);

    // Convert string dates back to Date objects
    pages = pages.map(p => ({
      ...p,
      timestamp: new Date(p.timestamp),
    }));

    if (startDate || endDate) {
      pages = pages.filter(p => {
        if (startDate && p.timestamp < startDate) return false;
        if (endDate && p.timestamp > endDate) return false;
        return true;
      });
    }

    return pages;
  } catch (error) {
    console.error('Failed to get page loads:', error);
    return [];
  }
}

/**
 * Get performance summary
 */
export function getPerformanceSummary(
  startDate?: Date,
  endDate?: Date
): PerformanceSummary {
  const queries = getQueries(startDate, endDate);
  const pages = getPageLoads(startDate, endDate);
  const memory = getMemoryMetrics();

  const slowQueries = queries.filter(q => q.slow);
  const averageQueryDuration =
    queries.length > 0
      ? queries.reduce((sum, q) => sum + q.duration, 0) / queries.length
      : 0;

  const slowestQuery = queries.length > 0
    ? queries.reduce((slowest, current) =>
        current.duration > slowest.duration ? current : slowest
      )
    : null;

  const averagePageLoadTime =
    pages.length > 0
      ? pages.reduce((sum, p) => sum + p.loadTime, 0) / pages.length
      : 0;

  const slowestPage = pages.length > 0
    ? pages.reduce((slowest, current) =>
        current.loadTime > slowest.loadTime ? current : slowest
      )
    : null;

  return {
    queries: {
      total: queries.length,
      slow: slowQueries.length,
      averageDuration: averageQueryDuration,
      slowestQuery,
    },
    pages: {
      total: pages.length,
      averageLoadTime: averagePageLoadTime,
      slowestPage,
    },
    memory,
    period: {
      start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago
      end: endDate || new Date(),
    },
  };
}

/**
 * Get slow queries (above threshold)
 */
export function getSlowQueries(limit = 10): QueryPerformance[] {
  const queries = getQueries();
  return queries
    .filter(q => q.slow)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);
}

/**
 * Get slow page loads (above threshold)
 */
export function getSlowPageLoads(limit = 10): PagePerformance[] {
  const thresholds = getThresholds();
  const pages = getPageLoads();
  return pages
    .filter(p => p.loadTime > thresholds.slowPageLoadMs)
    .sort((a, b) => b.loadTime - a.loadTime)
    .slice(0, limit);
}

/**
 * Clear all performance data
 */
export function clearPerformanceData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.queries);
    localStorage.removeItem(STORAGE_KEYS.pages);
    localStorage.removeItem(STORAGE_KEYS.metrics);
  } catch (error) {
    console.error('Failed to clear performance data:', error);
  }
}

/**
 * Export performance data
 */
export function exportPerformanceData(): {
  queries: QueryPerformance[];
  pages: PagePerformance[];
  summary: PerformanceSummary;
  exportDate: Date;
} {
  return {
    queries: getQueries(),
    pages: getPageLoads(),
    summary: getPerformanceSummary(),
    exportDate: new Date(),
  };
}

/**
 * Utility: Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    trackMetric(name, duration, 'ms');

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - start;
    trackMetric(`${name}_error`, duration, 'ms', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Utility: Measure sync function execution time
 */
export function measureSync<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  const start = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - start;

    trackMetric(name, duration, 'ms');

    return { result, duration };
  } catch (error) {
    const duration = performance.now() - start;
    trackMetric(`${name}_error`, duration, 'ms', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
