/**
 * Types for Performance Monitoring
 */

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface QueryPerformance {
  id: string;
  table: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'count';
  duration: number; // milliseconds
  recordCount?: number;
  timestamp: Date;
  slow: boolean; // duration > threshold
}

export interface PagePerformance {
  id: string;
  path: string;
  loadTime: number; // milliseconds
  renderTime: number; // milliseconds
  timestamp: Date;
  userAgent?: string;
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  percentage: number;
  timestamp: Date;
}

export interface PerformanceSummary {
  queries: {
    total: number;
    slow: number;
    averageDuration: number;
    slowestQuery: QueryPerformance | null;
  };
  pages: {
    total: number;
    averageLoadTime: number;
    slowestPage: PagePerformance | null;
  };
  memory: MemoryMetrics | null;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PerformanceThresholds {
  slowQueryMs: number;
  slowPageLoadMs: number;
  highMemoryPercentage: number;
}
