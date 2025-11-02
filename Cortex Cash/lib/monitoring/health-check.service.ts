/**
 * Health Check Service
 *
 * Verifica a saúde dos componentes críticos da aplicação
 */

import { getDB } from '@/lib/db/client';
import type {
  HealthCheckResult,
  HealthStatus,
  SystemHealth,
  HealthCheckConfig,
} from './types';

const DEFAULT_CONFIG: HealthCheckConfig = {
  timeout: 5000,
  criticalChecks: ['database', 'indexeddb', 'localStorage'],
};

/**
 * Executa um health check com timeout
 */
async function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), timeout)
    ),
  ]);
}

/**
 * Check: Database connectivity (Dexie)
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  const name = 'database';

  try {
    const db = getDB();

    // Tenta uma operação simples de leitura
    const count = await db.categorias.count();
    const duration = Date.now() - start;

    if (count >= 0) {
      return {
        name,
        status: 'healthy',
        message: 'Database is operational',
        timestamp: new Date(),
        duration,
        metadata: { categoriesCount: count },
      };
    }

    return {
      name,
      status: 'unhealthy',
      message: 'Database returned unexpected result',
      timestamp: new Date(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name,
      status: 'unhealthy',
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      duration,
    };
  }
}

/**
 * Check: IndexedDB availability
 */
async function checkIndexedDB(): Promise<HealthCheckResult> {
  const start = Date.now();
  const name = 'indexeddb';

  try {
    if (!('indexedDB' in window)) {
      return {
        name,
        status: 'unhealthy',
        message: 'IndexedDB not supported in this browser',
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    }

    // Test opening a temporary database
    const testDB = indexedDB.open('health-check-test', 1);

    await new Promise((resolve, reject) => {
      testDB.onsuccess = resolve;
      testDB.onerror = reject;
    });

    // Clean up test database
    indexedDB.deleteDatabase('health-check-test');

    const duration = Date.now() - start;
    return {
      name,
      status: 'healthy',
      message: 'IndexedDB is available and functional',
      timestamp: new Date(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name,
      status: 'unhealthy',
      message: `IndexedDB error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      duration,
    };
  }
}

/**
 * Check: LocalStorage availability
 */
async function checkLocalStorage(): Promise<HealthCheckResult> {
  const start = Date.now();
  const name = 'localStorage';

  try {
    if (!('localStorage' in window)) {
      return {
        name,
        status: 'unhealthy',
        message: 'LocalStorage not supported in this browser',
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    }

    // Test write/read/delete
    const testKey = '__health_check_test__';
    const testValue = Date.now().toString();

    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    if (retrieved !== testValue) {
      return {
        name,
        status: 'unhealthy',
        message: 'LocalStorage read/write mismatch',
        timestamp: new Date(),
        duration: Date.now() - start,
      };
    }

    const duration = Date.now() - start;
    return {
      name,
      status: 'healthy',
      message: 'LocalStorage is available and functional',
      timestamp: new Date(),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name,
      status: 'unhealthy',
      message: `LocalStorage error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      duration,
    };
  }
}

/**
 * Check: Services responsiveness
 */
async function checkServices(): Promise<HealthCheckResult> {
  const start = Date.now();
  const name = 'services';

  try {
    const db = getDB();

    // Test multiple critical services
    const [contas, categorias, transacoes] = await Promise.all([
      db.contas.count(),
      db.categorias.count(),
      db.transacoes.count(),
    ]);

    const duration = Date.now() - start;

    if (duration > 2000) {
      return {
        name,
        status: 'degraded',
        message: 'Services responding slowly',
        timestamp: new Date(),
        duration,
        metadata: { contas, categorias, transacoes },
      };
    }

    return {
      name,
      status: 'healthy',
      message: 'All services responding normally',
      timestamp: new Date(),
      duration,
      metadata: { contas, categorias, transacoes },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name,
      status: 'unhealthy',
      message: `Services error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      duration,
    };
  }
}

/**
 * Check: Data integrity
 */
async function checkDataIntegrity(): Promise<HealthCheckResult> {
  const start = Date.now();
  const name = 'dataIntegrity';

  try {
    const db = getDB();

    // Check for orphaned records or data inconsistencies
    const transacoes = await db.transacoes.limit(100).toArray();
    const contas = await db.contas.toArray();
    const contaIds = new Set(contas.map(c => c.id));

    let orphanedCount = 0;
    for (const t of transacoes) {
      if (t.conta_id && !contaIds.has(t.conta_id)) {
        orphanedCount++;
      }
    }

    const duration = Date.now() - start;

    if (orphanedCount > 0) {
      return {
        name,
        status: 'degraded',
        message: `Found ${orphanedCount} orphaned transactions`,
        timestamp: new Date(),
        duration,
        metadata: { orphanedTransactions: orphanedCount },
      };
    }

    return {
      name,
      status: 'healthy',
      message: 'Data integrity verified',
      timestamp: new Date(),
      duration,
      metadata: { orphanedTransactions: 0 },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name,
      status: 'degraded',
      message: `Data integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      duration,
    };
  }
}

/**
 * Check: Browser compatibility
 */
async function checkBrowserCompatibility(): Promise<HealthCheckResult> {
  const start = Date.now();
  const name = 'browserCompatibility';

  try {
    const features = {
      indexedDB: 'indexedDB' in window,
      localStorage: 'localStorage' in window,
      serviceWorker: 'serviceWorker' in navigator,
      crypto: 'crypto' in window && 'randomUUID' in crypto,
      intl: 'Intl' in window,
    };

    const missingFeatures = Object.entries(features)
      .filter(([_, supported]) => !supported)
      .map(([feature]) => feature);

    const duration = Date.now() - start;

    if (missingFeatures.length > 2) {
      return {
        name,
        status: 'unhealthy',
        message: `Browser missing critical features: ${missingFeatures.join(', ')}`,
        timestamp: new Date(),
        duration,
        metadata: { features, missingFeatures },
      };
    }

    if (missingFeatures.length > 0) {
      return {
        name,
        status: 'degraded',
        message: `Some features not supported: ${missingFeatures.join(', ')}`,
        timestamp: new Date(),
        duration,
        metadata: { features, missingFeatures },
      };
    }

    return {
      name,
      status: 'healthy',
      message: 'Browser fully compatible',
      timestamp: new Date(),
      duration,
      metadata: { features },
    };
  } catch (error) {
    const duration = Date.now() - start;
    return {
      name,
      status: 'degraded',
      message: `Browser compatibility check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date(),
      duration,
    };
  }
}

/**
 * Determina o status geral baseado nos checks individuais
 */
function calculateOverallStatus(
  checks: HealthCheckResult[],
  criticalChecks: string[]
): HealthStatus {
  const criticalResults = checks.filter(check =>
    criticalChecks.includes(check.name)
  );

  // Se algum check crítico está unhealthy, todo o sistema está unhealthy
  if (criticalResults.some(check => check.status === 'unhealthy')) {
    return 'unhealthy';
  }

  // Se algum check (crítico ou não) está unhealthy
  if (checks.some(check => check.status === 'unhealthy')) {
    return 'unhealthy';
  }

  // Se algum check está degraded
  if (checks.some(check => check.status === 'degraded')) {
    return 'degraded';
  }

  return 'healthy';
}

/**
 * Executa todos os health checks
 */
export async function runHealthChecks(
  config: Partial<HealthCheckConfig> = {}
): Promise<SystemHealth> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const checkFunctions = [
    checkDatabase,
    checkIndexedDB,
    checkLocalStorage,
    checkServices,
    checkDataIntegrity,
    checkBrowserCompatibility,
  ];

  // Run all checks in parallel with timeout
  const checks = await Promise.all(
    checkFunctions.map(fn =>
      runWithTimeout(fn(), finalConfig.timeout).catch(
        (error): HealthCheckResult => ({
          name: fn.name.replace('check', '').toLowerCase(),
          status: 'unhealthy',
          message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          duration: finalConfig.timeout,
        })
      )
    )
  );

  const overall = calculateOverallStatus(checks, finalConfig.criticalChecks);

  return {
    overall,
    checks,
    timestamp: new Date(),
    version: '0.4.0',
  };
}

/**
 * Executa um health check específico
 */
export async function runSingleHealthCheck(
  checkName: string
): Promise<HealthCheckResult> {
  const checks: Record<string, () => Promise<HealthCheckResult>> = {
    database: checkDatabase,
    indexeddb: checkIndexedDB,
    localStorage: checkLocalStorage,
    services: checkServices,
    dataIntegrity: checkDataIntegrity,
    browserCompatibility: checkBrowserCompatibility,
  };

  const checkFn = checks[checkName.toLowerCase()];

  if (!checkFn) {
    throw new Error(`Unknown health check: ${checkName}`);
  }

  return checkFn();
}

/**
 * Registra health check no localStorage para histórico
 */
export function logHealthCheck(health: SystemHealth): void {
  try {
    const key = 'health-check-history';
    const history = JSON.parse(localStorage.getItem(key) || '[]') as SystemHealth[];

    // Mantém apenas os últimos 50 checks
    history.push(health);
    if (history.length > 50) {
      history.shift();
    }

    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to log health check:', error);
  }
}

/**
 * Obtém histórico de health checks
 */
export function getHealthCheckHistory(): SystemHealth[] {
  try {
    const key = 'health-check-history';
    return JSON.parse(localStorage.getItem(key) || '[]') as SystemHealth[];
  } catch (error) {
    console.error('Failed to get health check history:', error);
    return [];
  }
}
