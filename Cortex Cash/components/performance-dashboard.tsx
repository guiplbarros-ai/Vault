'use client';

import { usePerformance } from '@/lib/hooks/use-performance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Activity, Database, Globe, MemoryStick } from 'lucide-react';

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

export function PerformanceDashboard() {
  const { summary, slowQueries, slowPages, memory, loading, refresh, clear } = usePerformance({
    autoRefresh: true,
    refreshInterval: 10000,
  });

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Loading performance data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Track application performance and identify bottlenecks
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={refresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={clear}
            variant="outline"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Queries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Database Queries
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.queries.total}</div>
            <p className="text-xs text-muted-foreground">
              {summary.queries.slow} slow queries
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Avg: {formatDuration(summary.queries.averageDuration)}
            </p>
          </CardContent>
        </Card>

        {/* Page Loads */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Page Loads
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pages.total}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatDuration(summary.pages.averageLoadTime)}
            </p>
          </CardContent>
        </Card>

        {/* Memory */}
        {memory && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Memory Usage
              </CardTitle>
              <MemoryStick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {memory.percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(memory.usedJSHeapSize)} / {formatBytes(memory.jsHeapSizeLimit)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Period */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monitoring Period
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {new Date(summary.period.start).toLocaleString()} -
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(summary.period.end).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Slow Queries */}
      {slowQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Slow Queries</CardTitle>
            <CardDescription>
              Database queries that exceeded performance thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowQueries.map((query) => (
                <div
                  key={query.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Database className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{query.table}</h4>
                      <Badge variant="secondary" className="text-xs uppercase">
                        {query.operation}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDuration(query.duration)}
                      </span>
                    </div>
                    {query.recordCount !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {query.recordCount} records
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(query.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slow Pages */}
      {slowPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Slow Page Loads</CardTitle>
            <CardDescription>
              Pages that took longer than expected to load
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowPages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Globe className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm font-mono">{page.path}</h4>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDuration(page.loadTime)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Render: {formatDuration(page.renderTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(page.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slowest Query */}
      {summary.queries.slowestQuery && (
        <Card>
          <CardHeader>
            <CardTitle>Slowest Query</CardTitle>
            <CardDescription>
              The slowest database query in the current period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10">
              <Database className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">
                    {summary.queries.slowestQuery.table}
                  </h4>
                  <Badge variant="destructive" className="text-xs uppercase">
                    {summary.queries.slowestQuery.operation}
                  </Badge>
                  <span className="text-xs font-bold text-red-500 ml-auto">
                    {formatDuration(summary.queries.slowestQuery.duration)}
                  </span>
                </div>
                {summary.queries.slowestQuery.recordCount !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {summary.queries.slowestQuery.recordCount} records
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
