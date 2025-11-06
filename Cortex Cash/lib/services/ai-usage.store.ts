/**
 * AI Usage Store Abstraction
 *
 * Provides server-safe and client-safe storage for AI usage tracking
 *
 * - ServerAIUsageStore: In-memory store for SSR/API routes
 * - DexieAIUsageStore: IndexedDB store for client-side
 */

import { getDB } from '@/lib/db/client';

export interface AIUsageRecord {
  id: string;
  timestamp: Date;
  tokens_total: number;
  custo_usd: number;
}

export interface IAIUsageStore {
  /**
   * Log a new AI usage record
   */
  logUsage(record: AIUsageRecord): Promise<void>;

  /**
   * Get total usage for a given period
   */
  getUsageSummary(startDate: Date, endDate: Date): Promise<{
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
  }>;

  /**
   * Clear all records (useful for testing)
   */
  clear?(): Promise<void>;
}

/**
 * Server-side in-memory store
 *
 * Uses a simple Map to track usage within a single process
 * Note: Data is ephemeral and resets on server restart
 */
export class ServerAIUsageStore implements IAIUsageStore {
  private records: Map<string, AIUsageRecord> = new Map();

  async logUsage(record: AIUsageRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async getUsageSummary(startDate: Date, endDate: Date): Promise<{
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
  }> {
    const filtered = Array.from(this.records.values()).filter(
      r => r.timestamp >= startDate && r.timestamp <= endDate
    );

    return {
      total_requests: filtered.length,
      total_tokens: filtered.reduce((sum, r) => sum + r.tokens_total, 0),
      total_cost_usd: filtered.reduce((sum, r) => sum + r.custo_usd, 0),
    };
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}

/**
 * Client-side Dexie store
 *
 * Uses IndexedDB via Dexie for persistent storage
 */
export class DexieAIUsageStore implements IAIUsageStore {
  async logUsage(record: AIUsageRecord): Promise<void> {
    const db = getDB();

    // Convert to Dexie format
    await db.logs_ia.add({
      id: record.id,
      transacao_id: undefined,
      prompt: '',
      resposta: '',
      modelo: 'gpt-4o-mini', // Default model
      tokens_prompt: 0,
      tokens_resposta: 0,
      tokens_total: record.tokens_total,
      custo_usd: record.custo_usd,
      categoria_sugerida_id: undefined,
      confianca: undefined,
      confirmada: false,
      created_at: record.timestamp,
    });
  }

  async getUsageSummary(startDate: Date, endDate: Date): Promise<{
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
  }> {
    const db = getDB();

    const logs = await db.logs_ia
      .where('created_at')
      .between(startDate, endDate, true, true)
      .toArray();

    return {
      total_requests: logs.length,
      total_tokens: logs.reduce((sum, log) => sum + log.tokens_total, 0),
      total_cost_usd: logs.reduce((sum, log) => sum + log.custo_usd, 0),
    };
  }
}

/**
 * Global server-side store instance
 * (resets on server restart)
 */
let serverStoreInstance: ServerAIUsageStore | null = null;

/**
 * Get or create server store instance
 */
export function getServerStore(): ServerAIUsageStore {
  if (!serverStoreInstance) {
    serverStoreInstance = new ServerAIUsageStore();
  }
  return serverStoreInstance;
}

/**
 * Create client store instance
 */
export function getClientStore(): DexieAIUsageStore {
  return new DexieAIUsageStore();
}

/**
 * Factory to get appropriate store based on environment
 */
export function getAIUsageStore(): IAIUsageStore {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return getClientStore();
  }

  // Server environment
  return getServerStore();
}

/**
 * Server-safe budget check
 *
 * Uses in-memory store for server, Dexie for client
 */
export async function checkAIBudgetLimitSafe(
  store: IAIUsageStore,
  currentMonth: Date,
  limitUsd: number,
  warningThreshold: number = 0.8
): Promise<{
  isNearLimit: boolean;
  isOverLimit: boolean;
  usedUsd: number;
  remainingUsd: number;
  percentageUsed: number;
}> {
  const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

  const summary = await store.getUsageSummary(startDate, endDate);

  const usedUsd = summary.total_cost_usd;
  const remainingUsd = Math.max(0, limitUsd - usedUsd);
  const percentageUsed = limitUsd > 0 ? (usedUsd / limitUsd) * 100 : 0;

  return {
    isNearLimit: percentageUsed >= warningThreshold * 100,
    isOverLimit: usedUsd > limitUsd,
    usedUsd,
    remainingUsd,
    percentageUsed,
  };
}
