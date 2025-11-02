'use client';

import { useHealthCheck } from '@/lib/hooks/use-health-check';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { HealthStatus, HealthCheckResult } from '@/lib/monitoring/types';

const statusConfig: Record<
  HealthStatus,
  { icon: any; color: string; label: string; badgeVariant: 'default' | 'destructive' | 'secondary' }
> = {
  healthy: {
    icon: CheckCircle2,
    color: 'text-green-500',
    label: 'Healthy',
    badgeVariant: 'default',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    label: 'Degraded',
    badgeVariant: 'secondary',
  },
  unhealthy: {
    icon: AlertCircle,
    color: 'text-red-500',
    label: 'Unhealthy',
    badgeVariant: 'destructive',
  },
};

interface HealthCheckItemProps {
  check: HealthCheckResult;
}

function HealthCheckItem({ check }: HealthCheckItemProps) {
  const config = statusConfig[check.status];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm capitalize">{check.name}</h4>
          <Badge variant={config.badgeVariant} className="text-xs">
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {check.duration}ms
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{check.message}</p>
        {check.metadata && Object.keys(check.metadata).length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            {Object.entries(check.metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span> {JSON.stringify(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function HealthCheckStatus() {
  const { health, loading, error, runCheck } = useHealthCheck({
    autoStart: true,
  });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            System Health Check Failed
          </CardTitle>
          <CardDescription>
            Unable to perform health check: {error.message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runCheck} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!health && loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Running Health Checks...</CardTitle>
          <CardDescription>Please wait while we verify system health</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!health) {
    return null;
  }

  const overallConfig = statusConfig[health.overall];
  const OverallIcon = overallConfig.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OverallIcon className={`h-6 w-6 ${overallConfig.color}`} />
            <div>
              <CardTitle>System Health</CardTitle>
              <CardDescription>
                Last checked: {new Date(health.timestamp).toLocaleString()}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={overallConfig.badgeVariant}
              className="text-sm px-3 py-1"
            >
              {overallConfig.label}
            </Badge>
            <Button
              onClick={runCheck}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {health.checks.map((check) => (
            <HealthCheckItem key={check.name} check={check} />
          ))}
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>System Version: {health.version}</span>
            <span>
              {health.checks.length} checks performed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
