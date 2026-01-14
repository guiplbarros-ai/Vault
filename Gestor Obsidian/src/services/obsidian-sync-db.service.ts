import { loadEnv } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js';

loadEnv();

export interface ObsidianSyncState {
  workspace_id: string;
  vault_id: string;
  source_path: string;
  note_id: string | null;
  source_hash: string;
  file_mtime: string | null;
  last_synced_at: string;
  status: 'ok' | 'skipped' | 'error';
  error: string;
}

class ObsidianSyncDbService {
  enabled(): boolean {
    return isSupabaseConfigured();
  }

  async get(workspaceId: string, vaultId: string, sourcePath: string): Promise<ObsidianSyncState | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('obsidian_sync_state')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('vault_id', vaultId)
      .eq('source_path', sourcePath)
      .maybeSingle();

    if (error) {
      logger.warn(`Supabase obsidian_sync_state get failed: ${error.message}`);
      return null;
    }
    return (data as any) || null;
  }

  async upsert(input: {
    workspaceId: string;
    vaultId: string;
    sourcePath: string;
    noteId: string | null;
    sourceHash: string;
    fileMtime?: string | null;
    status: 'ok' | 'skipped' | 'error';
    error?: string;
  }): Promise<void> {
    const supabase = getSupabaseClient();
    const payload = {
      workspace_id: input.workspaceId,
      vault_id: input.vaultId,
      source_path: input.sourcePath,
      note_id: input.noteId,
      source_hash: input.sourceHash,
      file_mtime: input.fileMtime ?? null,
      last_synced_at: new Date().toISOString(),
      status: input.status,
      error: input.error ?? '',
    };

    const { error } = await supabase
      .from('obsidian_sync_state')
      .upsert(payload, { onConflict: 'workspace_id,vault_id,source_path' });

    if (error) throw new Error(`Supabase obsidian_sync_state upsert failed: ${error.message}`);
  }
}

let instance: ObsidianSyncDbService | null = null;
export function getObsidianSyncDbService(): ObsidianSyncDbService {
  if (!instance) instance = new ObsidianSyncDbService();
  return instance;
}

export { ObsidianSyncDbService };

