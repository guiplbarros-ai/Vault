import { loadEnv } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js';

loadEnv();

export interface DbGoogleTokens {
  id: string;
  workspace_id: string;
  account_email: string;
  tokens: Record<string, unknown>;
  scopes: string;
  created_at: string;
  updated_at: string;
}

class GoogleTokensDbService {
  enabled(): boolean {
    return isSupabaseConfigured();
  }

  async upsert(input: {
    workspaceId: string;
    accountEmail: string;
    tokens: Record<string, unknown>;
    scopes: string;
  }): Promise<DbGoogleTokens> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('google_tokens')
      .upsert({
        workspace_id: input.workspaceId,
        account_email: input.accountEmail,
        tokens: input.tokens,
        scopes: input.scopes,
      }, { onConflict: 'workspace_id,account_email' })
      .select('*')
      .single();

    if (error || !data) throw new Error(`Supabase google_tokens upsert failed: ${error?.message || 'unknown'}`);
    return data as DbGoogleTokens;
  }

  async get(workspaceId: string, accountEmail: string): Promise<DbGoogleTokens | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('account_email', accountEmail)
      .maybeSingle();
    if (error) {
      logger.warn(`Supabase google_tokens get failed: ${error.message}`);
      return null;
    }
    return (data as DbGoogleTokens) || null;
  }

  async list(workspaceId: string): Promise<DbGoogleTokens[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('google_tokens')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('account_email', { ascending: true });
    if (error) {
      logger.warn(`Supabase google_tokens list failed: ${error.message}`);
      return [];
    }
    return (data || []) as DbGoogleTokens[];
  }
}

let instance: GoogleTokensDbService | null = null;

export function getGoogleTokensDbService(): GoogleTokensDbService {
  if (!instance) instance = new GoogleTokensDbService();
  return instance;
}

export { GoogleTokensDbService };

