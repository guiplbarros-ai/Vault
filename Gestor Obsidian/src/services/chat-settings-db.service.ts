import { loadEnv } from '../utils/env.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js';

loadEnv();

export type WorkspaceId = 'pessoal' | 'freelaw';

export interface ChatSettings {
  chat_id: number;
  workspace_id: WorkspaceId;
  google_account_email?: string | null;
  timezone: string;
  weather_location?: string | null;
  weather_location_label?: string | null;
  config_mode: boolean;
  created_at: string;
  updated_at: string;
}

function defaultWorkspace(): WorkspaceId {
  const raw = (process.env.CORTEX_DEFAULT_WORKSPACE || 'pessoal').trim().toLowerCase();
  return raw === 'freelaw' ? 'freelaw' : 'pessoal';
}

function formatSupabaseNetworkError(e: unknown): string {
  const err = e as any;
  const base = err instanceof Error ? err.message : String(e);
  const cause = err?.cause;
  if (cause && typeof cause === 'object') {
    const code = (cause as any).code ? String((cause as any).code) : '';
    const hostname = (cause as any).hostname ? String((cause as any).hostname) : '';
    const port = (cause as any).port ? String((cause as any).port) : '';
    const msg = (cause as any).message ? String((cause as any).message) : '';
    const bits = [code && `code=${code}`, hostname && `host=${hostname}`, port && `port=${port}`, msg && `cause=${msg}`]
      .filter(Boolean)
      .join(' ');
    if (bits) return `${base} (${bits})`;
  }
  return base;
}

function withCause(message: string, cause: unknown): Error {
  // Preserve the original cause for Node's error inspection/logging
  // (supported in Node >= 16; we're on Node 22 in Dockerfile).
  return new Error(message, { cause: cause as any });
}

class ChatSettingsDbService {
  enabled(): boolean {
    return isSupabaseConfigured();
  }

  async getOrCreate(chatId: number): Promise<ChatSettings> {
    const supabase = getSupabaseClient();
    try {
      const { data: existing } = await supabase
        .from('chat_settings')
        .select('*')
        .eq('chat_id', chatId)
        .maybeSingle();
      if (existing) return existing as ChatSettings;
    } catch (e) {
      // keep original error as cause so we can extract network details later
      throw withCause(`Supabase chat_settings select failed: ${formatSupabaseNetworkError(e)}`, e);
    }

    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .insert({ chat_id: chatId, workspace_id: defaultWorkspace() })
        .select('*')
        .single();
      if (error || !data) {
        // This is a Supabase API error (not network). Don't re-wrap later.
        throw new Error(`Supabase chat_settings insert failed: ${error?.message || 'unknown'}`);
      }
      return data as ChatSettings;
    } catch (e) {
      // Avoid double-wrapping our own domain errors
      if (e instanceof Error && e.message.startsWith('Supabase chat_settings')) throw e;
      throw withCause(`Supabase chat_settings insert failed: ${formatSupabaseNetworkError(e)}`, e);
    }
  }

  async setWorkspace(chatId: number, workspaceId: WorkspaceId): Promise<ChatSettings> {
    const supabase = getSupabaseClient();
    await this.getOrCreate(chatId);
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .update({ workspace_id: workspaceId })
        .eq('chat_id', chatId)
        .select('*')
        .single();
      if (error || !data) throw new Error(`Supabase chat_settings update failed: ${error?.message || 'unknown'}`);
      return data as ChatSettings;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('Supabase chat_settings')) throw e;
      throw withCause(`Supabase chat_settings update failed: ${formatSupabaseNetworkError(e)}`, e);
    }
  }

  async setGoogleAccountEmail(chatId: number, email: string | null): Promise<ChatSettings> {
    const supabase = getSupabaseClient();
    await this.getOrCreate(chatId);
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .update({ google_account_email: email })
        .eq('chat_id', chatId)
        .select('*')
        .single();
      if (error || !data) throw new Error(`Supabase chat_settings update failed: ${error?.message || 'unknown'}`);
      return data as ChatSettings;
    } catch (e) {
      throw new Error(`Supabase chat_settings update failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async setWeatherLocation(chatId: number, input: { location: string; label?: string | null }): Promise<ChatSettings> {
    const supabase = getSupabaseClient();
    await this.getOrCreate(chatId);
    try {
      const { data, error } = await supabase
        .from('chat_settings')
        .update({ weather_location: input.location, weather_location_label: input.label ?? null })
        .eq('chat_id', chatId)
        .select('*')
        .single();
      if (error || !data) throw new Error(`Supabase chat_settings update failed: ${error?.message || 'unknown'}`);
      return data as ChatSettings;
    } catch (e) {
      throw new Error(`Supabase chat_settings update failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

let instance: ChatSettingsDbService | null = null;

export function getChatSettingsDbService(): ChatSettingsDbService {
  if (!instance) instance = new ChatSettingsDbService();
  return instance;
}

export { ChatSettingsDbService };

