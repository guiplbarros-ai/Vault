/**
 * Types for Health Check Monitoring System
 */

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  message: string;
  timestamp: Date;
  duration: number; // milliseconds
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  overall: HealthStatus;
  checks: HealthCheckResult[];
  timestamp: Date;
  version: string;
}

export interface HealthCheckConfig {
  timeout: number; // milliseconds
  criticalChecks: string[]; // checks that cause overall status to be unhealthy
}

export type HealthCheckFunction = () => Promise<HealthCheckResult>;
