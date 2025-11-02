/**
 * Hook for Health Check Monitoring
 */

import { useState, useEffect, useCallback } from 'react';
import {
  runHealthChecks,
  logHealthCheck,
  getHealthCheckHistory,
} from '@/lib/monitoring/health-check.service';
import type { SystemHealth } from '@/lib/monitoring/types';

export interface UseHealthCheckOptions {
  autoStart?: boolean;
  interval?: number; // milliseconds, 0 = no auto-refresh
  onStatusChange?: (health: SystemHealth) => void;
}

export function useHealthCheck(options: UseHealthCheckOptions = {}) {
  const {
    autoStart = false,
    interval = 0,
    onStatusChange,
  } = options;

  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<SystemHealth[]>([]);

  const runCheck = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await runHealthChecks();
      setHealth(result);
      logHealthCheck(result);

      // Refresh history
      setHistory(getHealthCheckHistory());

      // Notify callback
      onStatusChange?.(result);

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      runCheck();
    }

    // Load history on mount
    setHistory(getHealthCheckHistory());
  }, [autoStart, runCheck]);

  // Auto-refresh with interval
  useEffect(() => {
    if (interval > 0) {
      const timer = setInterval(() => {
        runCheck();
      }, interval);

      return () => clearInterval(timer);
    }
  }, [interval, runCheck]);

  return {
    health,
    loading,
    error,
    history,
    runCheck,
    refresh: runCheck,
  };
}
