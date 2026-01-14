import { loadEnv } from '../utils/env.js';
import { logger } from '../utils/logger.js';
import { getSupabaseClient, isSupabaseConfigured } from './supabase.service.js';

loadEnv();

export interface DbTaxon {
  id: string;
  workspace_id: string;
  namespace: string;
  slug: string;
  title: string;
  parent_id: string | null;
  description: string;
  created_at: string;
}

class TaxonsDbService {
  enabled(): boolean {
    return isSupabaseConfigured();
  }

  async listByNamespace(workspaceId: string, namespace: string): Promise<DbTaxon[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('taxons')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('namespace', namespace)
      .order('title', { ascending: true });

    if (error) {
      logger.warn(`Supabase taxons list failed: ${error.message}`);
      return [];
    }
    return (data || []) as DbTaxon[];
  }
}

let instance: TaxonsDbService | null = null;

export function getTaxonsDbService(): TaxonsDbService {
  if (!instance) instance = new TaxonsDbService();
  return instance;
}

export { TaxonsDbService };

