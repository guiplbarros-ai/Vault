import { loadEnv } from '../utils/env.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js';

loadEnv();

export type UsageProvider = 'openai' | 'fly' | 'other';

export interface UsageEventInput {
  provider: UsageProvider | string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  usdEstimate?: number | null;
  chatId?: number | null;
  workspaceId?: string | null;
  meta?: Record<string, unknown>;
}

class UsageDbService {
  enabled(): boolean {
    return isSupabaseConfigured();
  }

  async insertEvent(input: UsageEventInput): Promise<void> {
    const supabase = getSupabaseClient();
    const row = {
      provider: input.provider,
      model: input.model ?? null,
      input_tokens: Number.isFinite(input.inputTokens as number) ? input.inputTokens : null,
      output_tokens: Number.isFinite(input.outputTokens as number) ? input.outputTokens : null,
      usd_estimate: Number.isFinite(input.usdEstimate as number) ? input.usdEstimate : null,
      chat_id: input.chatId ?? null,
      workspace_id: input.workspaceId ?? null,
      meta: input.meta ?? {},
    };
    await supabase.from('usage_events').insert(row);
  }

  async sumLastDays(input: { provider: string; days: number }): Promise<{
    usd: number | null;
    inputTokens: number;
    outputTokens: number;
    count: number;
  }> {
    const supabase = getSupabaseClient();
    const days = Math.max(1, Math.min(90, input.days));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('usage_events')
      .select('usd_estimate,input_tokens,output_tokens')
      .eq('provider', input.provider)
      .gte('created_at', since);
    if (error) throw new Error(`Supabase usage_events select failed: ${error.message}`);

    const rows = (data || []) as Array<{ usd_estimate: number | null; input_tokens: number | null; output_tokens: number | null }>;
    const usdSum = rows.reduce((s, r) => s + (Number(r.usd_estimate) || 0), 0);
    const hasUsd = rows.some(r => Number.isFinite(Number(r.usd_estimate)));
    const inputTokens = rows.reduce((s, r) => s + (Number(r.input_tokens) || 0), 0);
    const outputTokens = rows.reduce((s, r) => s + (Number(r.output_tokens) || 0), 0);

    return { usd: hasUsd ? usdSum : null, inputTokens, outputTokens, count: rows.length };
  }
}

let instance: UsageDbService | null = null;
export function getUsageDbService(): UsageDbService {
  if (!instance) instance = new UsageDbService();
  return instance;
}

