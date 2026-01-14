import { loadEnv } from '../utils/env.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js';

loadEnv();

export type DigestKind = 'daily' | 'weekly';

export interface DigestScheduleRow {
  id: string;
  chat_id: number;
  kind: DigestKind;
  cron_expression: string;
  enabled: boolean;
  timezone: string;
  created_at: string;
  updated_at: string;
}

class DigestSchedulesDbService {
  enabled(): boolean {
    return isSupabaseConfigured();
  }

  async listEnabled(): Promise<DigestScheduleRow[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('digest_schedules')
      .select('*')
      .eq('enabled', true);
    if (error) throw new Error(`Supabase digest_schedules select failed: ${error.message}`);
    return (data || []) as DigestScheduleRow[];
  }

  async replaceForChatKind(input: { chatId: number; kind: DigestKind; schedules: Array<{ cronExpression: string; timezone?: string }> }): Promise<void> {
    const supabase = getSupabaseClient();
    const { error: delErr } = await supabase
      .from('digest_schedules')
      .delete()
      .eq('chat_id', input.chatId)
      .eq('kind', input.kind);
    if (delErr) throw new Error(`Supabase digest_schedules delete failed: ${delErr.message}`);

    if (input.schedules.length === 0) return;
    const rows = input.schedules.map(s => ({
      chat_id: input.chatId,
      kind: input.kind,
      cron_expression: s.cronExpression,
      enabled: true,
      timezone: s.timezone || 'America/Sao_Paulo',
    }));
    const { error: insErr } = await supabase.from('digest_schedules').insert(rows);
    if (insErr) throw new Error(`Supabase digest_schedules insert failed: ${insErr.message}`);
  }

  async removeChatKind(chatId: number, kind: DigestKind): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('digest_schedules')
      .delete()
      .eq('chat_id', chatId)
      .eq('kind', kind);
    if (error) throw new Error(`Supabase digest_schedules delete failed: ${error.message}`);
  }
}

let instance: DigestSchedulesDbService | null = null;
export function getDigestSchedulesDbService(): DigestSchedulesDbService {
  if (!instance) instance = new DigestSchedulesDbService();
  return instance;
}

